from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.habit import (
    HabitCreate,
    HabitUpdate,
    HabitResponse,
    HabitStatus,
    PresetHabit,
    ConvertDraftRequest
)
from app.utils.preset_habits import get_preset_habits
from app.utils.security import decode_access_token
from config.database import get_database
from bson import ObjectId
from datetime import datetime
from typing import List
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.routes.auth import get_current_user

router = APIRouter(prefix="/habits", tags=["Habits"])
security = HTTPBearer()


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    return payload.get("sub")


def format_habit_response(habit: dict) -> HabitResponse:
    """Helper to format habit dict into HabitResponse"""
    return HabitResponse(
        id=str(habit["_id"]),
        habit_name=habit["habit_name"],
        habit_type=habit["habit_type"],
        category=habit.get("category", habit.get("habit_category", "")),
        description=habit.get("description", habit.get("habit_description")),
        goal=habit.get("goal"),
        count_checkins=habit.get("count_checkins", 0),
        frequency=habit.get("frequency", "daily"),
        partnership_id=habit.get("partnership_id"),
        status=habit["status"],
        created_by=habit["created_by"],
        created_at=habit["created_at"]
    )


@router.get("/library", response_model=List[PresetHabit])
async def get_habit_library():
    """Get preset habit library"""
    return get_preset_habits()


@router.post("", response_model=HabitResponse, status_code=status.HTTP_201_CREATED)
async def create_habit(
        habit: HabitCreate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Create new habit for partnership - Requires partner approval
    Habit will be in PENDING_APPROVAL status until partner approves
    """
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Verify partnership exists and user is part of it
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(habit.partnership_id),
        "$or": [
            {"user_id_1": ObjectId(user_id)},  # ✅ FIXED: Convert to ObjectId
            {"user_id_2": ObjectId(user_id)}   # ✅ FIXED: Convert to ObjectId
        ],
        "status": "active"
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found or inactive"
        )

    # Create habit with PENDING_APPROVAL status
    habit_data = habit.model_dump()
    habit_data["created_by"] = user_id
    habit_data["status"] = HabitStatus.PENDING_APPROVAL.value
    habit_data["approved_by"] = None
    habit_data["count_checkins"] = 0
    habit_data["created_at"] = datetime.utcnow()
    habit_data["updated_at"] = datetime.utcnow()
    habit_data["pending_edit"] = None

    result = await db.habits.insert_one(habit_data)
    created_habit = await db.habits.find_one({"_id": result.inserted_id})

    return format_habit_response(created_habit)


@router.get("/pending-approval", response_model=List[HabitResponse])
async def get_pending_habits(
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get habits waiting for current user's approval"""
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Find user's partnerships
    partnerships = await db.partnerships.find({
        "$or": [
            {"user_id_1": ObjectId(user_id)},  # ✅ FIXED
            {"user_id_2": ObjectId(user_id)}   # ✅ FIXED
        ],
        "status": "active"
    }).to_list(100)

    partnership_ids = [str(p["_id"]) for p in partnerships]

    # Get pending habits where current user is NOT the creator
    habits = await db.habits.find({
        "partnership_id": {"$in": partnership_ids},
        "status": HabitStatus.PENDING_APPROVAL.value,
        "created_by": {"$ne": user_id}
    }).to_list(100)

    return [format_habit_response(habit) for habit in habits]


@router.get("", response_model=List[HabitResponse])
async def get_habits(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all ACTIVE habits for user's partnerships"""
    user_id = await get_current_user_id(credentials)

    # Find user's partnerships - ✅ FIXED: Convert user_id to ObjectId
    partnerships = await db.partnerships.find({
        "$or": [
            {"user_id_1": ObjectId(user_id)},
            {"user_id_2": ObjectId(user_id)}
        ],
        "status": "active"
    }).to_list(100)

    partnership_ids = [str(p["_id"]) for p in partnerships]

    # Get all ACTIVE habits for these partnerships
    habits = await db.habits.find({
        "partnership_id": {"$in": partnership_ids},
        "status": HabitStatus.ACTIVE.value
    }).to_list(1000)

    return [format_habit_response(habit) for habit in habits]


@router.get("/{habit_id}", response_model=HabitResponse)
async def get_habit(
        habit_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get specific habit details"""
    db = get_database()
    user_id = await get_current_user_id(credentials)

    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )

    # Verify user is part of partnership
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(habit["partnership_id"]),
        "$or": [
            {"user_id_1": ObjectId(user_id)},  # ✅ FIXED
            {"user_id_2": ObjectId(user_id)}   # ✅ FIXED
        ]
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return format_habit_response(habit)


@router.post("/{habit_id}/approve")
async def approve_habit(
        habit_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Approve a pending habit"""
    db = get_database()
    user_id = await get_current_user_id(credentials)

    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )

    # Verify user is part of partnership
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(habit["partnership_id"]),
        "$or": [
            {"user_id_1": ObjectId(user_id)},  # ✅ FIXED
            {"user_id_2": ObjectId(user_id)}   # ✅ FIXED
        ]
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    if habit["created_by"] == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve your own habit"
        )

    if habit["status"] != HabitStatus.PENDING_APPROVAL.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Habit is not pending approval"
        )

    # Approve habit
    await db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {
            "$set": {
                "status": HabitStatus.ACTIVE.value,
                "approved_by": user_id,
                "updated_at": datetime.utcnow()
            }
        }
    )

    return {"message": "Habit approved", "habit_id": habit_id}


@router.post("/{habit_id}/reject")
async def reject_habit(
        habit_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Reject a pending habit (deletes it)"""
    db = get_database()
    user_id = await get_current_user_id(credentials)

    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )

    # Verify user is part of partnership
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(habit["partnership_id"]),
        "$or": [
            {"user_id_1": ObjectId(user_id)},  # ✅ FIXED
            {"user_id_2": ObjectId(user_id)}   # ✅ FIXED
        ]
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    if habit["created_by"] == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reject your own habit"
        )

    if habit["status"] != HabitStatus.PENDING_APPROVAL.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Habit is not pending approval"
        )

    # Delete the rejected habit
    await db.habits.delete_one({"_id": ObjectId(habit_id)})

    return {"message": "Habit rejected and deleted", "habit_id": habit_id}


# Draft routes
@router.post("/drafts", response_model=HabitResponse, status_code=status.HTTP_201_CREATED)
async def create_habit_draft(
        habit_data: HabitCreate,
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a habit draft (status = DRAFT)"""
    habit_dict = habit_data.model_dump(exclude_none=True)
    habit_dict["created_by"] = current_user.id
    habit_dict["status"] = HabitStatus.DRAFT.value
    habit_dict["partnership_id"] = None
    habit_dict["created_at"] = datetime.utcnow()
    habit_dict["updated_at"] = datetime.utcnow()

    result = await db.habits.insert_one(habit_dict)
    created_habit = await db.habits.find_one({"_id": result.inserted_id})
    
    return format_habit_response(created_habit)


@router.get("/drafts", response_model=List[HabitResponse])
async def get_user_drafts(
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all draft habits for the authenticated user"""
    drafts = await db.habits.find({
        "created_by": current_user.id,
        "status": HabitStatus.DRAFT.value
    }).to_list(length=None)

    return [format_habit_response(draft) for draft in drafts]


@router.get("/drafts/{draft_id}", response_model=HabitResponse)
async def get_draft(
        draft_id: str,
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific draft by ID"""
    if not ObjectId.is_valid(draft_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid draft ID format"
        )

    draft = await db.habits.find_one({
        "_id": ObjectId(draft_id),
        "created_by": current_user.id,
        "status": HabitStatus.DRAFT.value
    })

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found"
        )

    return format_habit_response(draft)


@router.put("/drafts/{draft_id}", response_model=HabitResponse)
async def update_habit_draft(
        draft_id: str,
        habit_data: HabitUpdate,
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update an existing habit draft"""
    if not ObjectId.is_valid(draft_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid draft ID format"
        )

    existing_draft = await db.habits.find_one({
        "_id": ObjectId(draft_id),
        "created_by": current_user.id,
        "status": HabitStatus.DRAFT.value
    })

    if not existing_draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found"
        )

    update_dict = habit_data.model_dump(exclude_none=True)
    update_dict["updated_at"] = datetime.utcnow()

    await db.habits.update_one(
        {"_id": ObjectId(draft_id)},
        {"$set": update_dict}
    )

    updated_draft = await db.habits.find_one({"_id": ObjectId(draft_id)})
    return format_habit_response(updated_draft)


@router.delete("/drafts/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_habit_draft(
        draft_id: str,
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a habit draft"""
    if not ObjectId.is_valid(draft_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid draft ID format"
        )

    result = await db.habits.delete_one({
        "_id": ObjectId(draft_id),
        "created_by": current_user.id,
        "status": HabitStatus.DRAFT.value
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found"
        )

    return None