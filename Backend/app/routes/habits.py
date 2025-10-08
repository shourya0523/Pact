from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.habit import (
    HabitCreate,
    HabitUpdate,
    HabitResponse,
    HabitStatus,
    PresetHabit
)
from app.utils.preset_habits import get_preset_habits
from app.utils.security import decode_access_token
from config.database import get_database
from bson import ObjectId
from datetime import datetime
from typing import List

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


@router.get("/library", response_model=List[PresetHabit])
async def get_habit_library():
    """Get preset habit library"""
    return get_preset_habits()


@router.post("", response_model=HabitResponse, status_code=status.HTTP_201_CREATED)
async def create_habit(
        habit: HabitCreate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create new habit for partnership"""
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Verify partnership exists and user is part of it
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(habit.partnership_id),
        "$or": [
            {"user_id_1": user_id},
            {"user_id_2": user_id}
        ],
        "status": "active"
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found or inactive"
        )

    # Create habit
    habit_data = habit.model_dump()
    habit_data["created_by"] = user_id
    habit_data["status"] = HabitStatus.ACTIVE.value
    habit_data["created_at"] = datetime.utcnow()
    habit_data["updated_at"] = datetime.utcnow()
    habit_data["pending_edit"] = None

    result = await db.habits.insert_one(habit_data)

    # Get created habit
    created_habit = await db.habits.find_one({"_id": result.inserted_id})

    return HabitResponse(
        id=str(created_habit["_id"]),
        habit_name=created_habit["habit_name"],
        habit_type=created_habit["habit_type"],
        category=created_habit["category"],
        description=created_habit.get("description"),
        partnership_id=created_habit["partnership_id"],
        status=created_habit["status"],
        created_at=created_habit["created_at"]
    )


@router.get("", response_model=List[HabitResponse])
async def get_habits(
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all habits for user's partnerships"""
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Find user's partnerships
    partnerships = await db.partnerships.find({
        "$or": [
            {"user_id_1": user_id},
            {"user_id_2": user_id}
        ],
        "status": "active"
    }).to_list(100)

    partnership_ids = [str(p["_id"]) for p in partnerships]

    # Get all habits for these partnerships
    habits = await db.habits.find({
        "partnership_id": {"$in": partnership_ids},
        "status": {"$ne": HabitStatus.ARCHIVED.value}
    }).to_list(1000)

    return [
        HabitResponse(
            id=str(habit["_id"]),
            habit_name=habit["habit_name"],
            habit_type=habit["habit_type"],
            category=habit["category"],
            description=habit.get("description"),
            partnership_id=habit["partnership_id"],
            status=habit["status"],
            created_at=habit["created_at"]
        )
        for habit in habits
    ]


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
            {"user_id_1": user_id},
            {"user_id_2": user_id}
        ]
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return HabitResponse(
        id=str(habit["_id"]),
        habit_name=habit["habit_name"],
        habit_type=habit["habit_type"],
        category=habit["category"],
        description=habit.get("description"),
        partnership_id=habit["partnership_id"],
        status=habit["status"],
        created_at=habit["created_at"]
    )


@router.put("/{habit_id}", response_model=dict)
async def update_habit(
        habit_id: str,
        updates: HabitUpdate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Propose edit to habit - requires partner approval"""
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
            {"user_id_1": user_id},
            {"user_id_2": user_id}
        ]
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Store pending edit
    update_data = updates.model_dump(exclude_unset=True)

    await db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {
            "$set": {
                "pending_edit": {
                    "proposed_by": user_id,
                    "changes": update_data,
                    "proposed_at": datetime.utcnow()
                },
                "status": HabitStatus.PENDING_APPROVAL.value
            }
        }
    )

    return {
        "message": "Edit proposed, awaiting partner approval",
        "habit_id": habit_id
    }


@router.post("/{habit_id}/approve-edit")
async def approve_habit_edit(
        habit_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Approve pending habit edit"""
    db = get_database()
    user_id = await get_current_user_id(credentials)

    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    if not habit or not habit.get("pending_edit"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending edit found"
        )

    # Verify user is partner (not the one who proposed)
    if habit["pending_edit"]["proposed_by"] == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot approve your own edit"
        )

    # Apply changes
    changes = habit["pending_edit"]["changes"]
    changes["status"] = HabitStatus.ACTIVE.value
    changes["pending_edit"] = None
    changes["updated_at"] = datetime.utcnow()

    await db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {"$set": changes}
    )

    return {"message": "Habit updated successfully"}


@router.delete("/{habit_id}")
async def delete_habit(
        habit_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete habit - requires both partners' consent"""
    db = get_database()
    user_id = await get_current_user_id(credentials)

    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )

    # For MVP: Direct delete (we can add approval flow later)
    await db.habits.delete_one({"_id": ObjectId(habit_id)})

    return {"message": "Habit deleted successfully"}


@router.post("/{habit_id}/archive")
async def archive_habit(
        habit_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Archive completed habit"""
    db = get_database()
    user_id = await get_current_user_id(credentials)

    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )

    await db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {
            "$set": {
                "status": HabitStatus.ARCHIVED.value,
                "updated_at": datetime.utcnow()
            }
        }
    )

    return {"message": "Habit archived successfully"}