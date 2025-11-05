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

    # Get created habit
    created_habit = await db.habits.find_one({"_id": result.inserted_id})

    # TODO: Send notification to partner about new habit approval request

    return HabitResponse(
        id=str(created_habit["_id"]),
        habit_name=created_habit["habit_name"],
        habit_type=created_habit["habit_type"],
        category=created_habit["category"],
        description=created_habit.get("description"),
        goal=created_habit.get("goal"),
        count_checkins=created_habit.get("count_checkins", 0),
        frequency=created_habit.get("frequency", "daily"),
        partnership_id=created_habit["partnership_id"],
        status=created_habit["status"],
        created_by=created_habit["created_by"],
        created_at=created_habit["created_at"]
    )


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
            {"user_id_1": user_id},
            {"user_id_2": user_id}
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

    return [
        HabitResponse(
            id=str(habit["_id"]),
            habit_name=habit["habit_name"],
            habit_type=habit["habit_type"],
            category=habit["category"],
            description=habit.get("description"),
            goal=habit.get("goal"),
            count_checkins=habit.get("count_checkins", 0),
            frequency=habit.get("frequency", "daily"),
            partnership_id=habit["partnership_id"],
            status=habit["status"],
            created_by=habit["created_by"],
            created_at=habit["created_at"]
        )
        for habit in habits
    ]


# Routes for Habit draft - MUST come before /{habit_id} routes
@router.post(
    "/drafts",
    response_model=HabitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create habit draft",
    description="Create a new habit draft. User can save their progress before finding a partner."
)
async def create_habit_draft(
        habit_data: HabitCreate,
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Create a habit draft (status = DRAFT).

    Drafts don't require a partner and allow users to:
    - Save their habit creation progress
    - Come back and edit later
    - Convert to active habit when they find a partner

    The habit will have status="draft" and partnership_id=None.
    """
    habit_dict = habit_data.model_dump(exclude_none=True)
    habit_dict["created_by"] = current_user.id  # Changed from current_user["user_id"]
    habit_dict["status"] = HabitStatus.DRAFT.value  # Set as draft
    habit_dict["partnership_id"] = None  # No partner yet
    habit_dict["created_at"] = datetime.utcnow()
    habit_dict["updated_at"] = datetime.utcnow()

    result = await db.habits.insert_one(habit_dict)

    created_habit = await db.habits.find_one({"_id": result.inserted_id})
    return format_habit_response(created_habit)


@router.get(
    "/drafts",
    response_model=List[HabitResponse],
    summary="Get user's habit drafts",
    description="Get all draft habits for the current user."
)
async def get_user_drafts(
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get all draft habits for the authenticated user.

    Drafts are habits with:
    - status = "draft"
    - created_by = current user
    - partnership_id = None

    Frontend can use this to restore the user's work in progress.
    """
    drafts = await db.habits.find({
        "created_by": current_user.id,  # Changed from current_user["user_id"]
        "status": HabitStatus.DRAFT.value
    }).to_list(length=None)

    return [format_habit_response(draft) for draft in drafts]


@router.get(
    "/drafts/{draft_id}",
    response_model=HabitResponse,
    summary="Get specific habit draft",
    description="Get a specific draft habit by ID."
)
async def get_draft(
        draft_id: str,
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get a specific draft by ID.

    Only the creator can access their own drafts.
    """
    # Validate ObjectId
    if not ObjectId.is_valid(draft_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid draft ID format"
        )

    draft = await db.habits.find_one({
        "_id": ObjectId(draft_id),
        "created_by": current_user.id,  # Changed from current_user["user_id"]
        "status": HabitStatus.DRAFT.value
    })

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found"
        )

    return format_habit_response(draft)


@router.put(
    "/drafts/{draft_id}",
    response_model=HabitResponse,
    summary="Update habit draft",
    description="Update an existing habit draft."
)
async def update_habit_draft(
        draft_id: str,
        habit_data: HabitUpdate,
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update an existing habit draft.

    Only the creator can update their own drafts.
    All fields are optional - only provided fields will be updated.
    """
    # Validate ObjectId
    if not ObjectId.is_valid(draft_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid draft ID format"
        )

    # Check if draft exists and belongs to user
    existing_draft = await db.habits.find_one({
        "_id": ObjectId(draft_id),
        "created_by": current_user.id,  # Changed from current_user["user_id"]
        "status": HabitStatus.DRAFT.value
    })

    if not existing_draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found"
        )

    # Prepare update data
    update_dict = habit_data.model_dump(exclude_none=True)
    update_dict["updated_at"] = datetime.utcnow()

    # Update the draft
    result = await db.habits.update_one(
        {"_id": ObjectId(draft_id)},
        {"$set": update_dict}
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update draft"
        )

    # Return updated draft
    updated_draft = await db.habits.find_one({"_id": ObjectId(draft_id)})
    return format_habit_response(updated_draft)


@router.delete(
    "/drafts/{draft_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete habit draft",
    description="Delete a habit draft."
)
async def delete_habit_draft(
        draft_id: str,
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Delete a habit draft.

    Only the creator can delete their own drafts.
    """
    # Validate ObjectId
    if not ObjectId.is_valid(draft_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid draft ID format"
        )

    result = await db.habits.delete_one({
        "_id": ObjectId(draft_id),
        "created_by": current_user.id,  # Changed from current_user["user_id"]
        "status": HabitStatus.DRAFT.value
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found"
        )

    return None


@router.post(
    "/drafts/{draft_id}/convert",
    response_model=HabitResponse,
    summary="Convert draft to active habit",
    description="Convert a draft to active habit when user finds a partner."
)
async def convert_draft_to_habit(
        draft_id: str,
        request: ConvertDraftRequest,
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Convert a draft to an active habit.

    This is called when:
    - User finds a partner
    - Partner accepts the partnership

    The draft status changes from DRAFT → PENDING_APPROVAL
    and partnership_id is added.
    """
    # Validate ObjectId
    if not ObjectId.is_valid(draft_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid draft ID format"
        )

    # Check if draft exists
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

    # Verify partnership exists
    partnership = await db.partnerships.find_one({"_id": ObjectId(request.partnership_id)})  # ← CHANGE THIS LINE
    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found"
        )

    # Update draft to active habit
    result = await db.habits.update_one(
        {"_id": ObjectId(draft_id)},
        {
            "$set": {
                "status": HabitStatus.PENDING_APPROVAL.value,
                "partnership_id": request.partnership_id,  # ← CHANGE THIS LINE
                "updated_at": datetime.utcnow()
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to convert draft"
        )

    # Return converted habit
    converted_habit = await db.habits.find_one({"_id": ObjectId(draft_id)})
    return format_habit_response(converted_habit)

# Parameterized routes MUST come after specific routes like /drafts
@router.post("/{habit_id}/approve", response_model=dict)
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

    # Verify user is part of partnership but not the creator
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

    return {
        "message": "Habit approved successfully",
        "habit_id": habit_id
    }


@router.post("/{habit_id}/reject", response_model=dict)
async def reject_habit(
        habit_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Reject a pending habit"""
    db = get_database()
    user_id = await get_current_user_id(credentials)

    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )

    # Verify user is part of partnership but not the creator
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

    return {
        "message": "Habit rejected and deleted",
        "habit_id": habit_id
    }


@router.get("", response_model=List[HabitResponse])
@router.get("", response_model=List[HabitResponse])
async def get_habits(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)  # Add this
):
    """Get all ACTIVE habits for user's partnerships"""
    # Remove this line: db = get_database()
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

    # Get all ACTIVE habits for these partnerships
    habits = await db.habits.find({
        "partnership_id": {"$in": partnership_ids},
        "status": HabitStatus.ACTIVE.value
    }).to_list(1000)

    return [
        HabitResponse(
            id=str(habit["_id"]),
            habit_name=habit["habit_name"],
            habit_type=habit["habit_type"],
            category=habit["category"],
            description=habit.get("description"),
            goal=habit.get("goal"),
            count_checkins=habit.get("count_checkins", 0),
            frequency=habit.get("frequency", "daily"),
            partnership_id=habit["partnership_id"],
            status=habit["status"],
            created_by=habit["created_by"],
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
        goal=habit.get("goal"),
        count_checkins=habit.get("count_checkins", 0),
        frequency=habit.get("frequency", "daily"),
        partnership_id=habit["partnership_id"],
        status=habit["status"],
        created_by=habit["created_by"],
        created_at=habit["created_at"]
    )


@router.post("/{habit_id}/checkin", response_model=dict)
async def checkin_habit(
        habit_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Check in to a habit - increments count_checkins"""
    db = get_database()
    user_id = await get_current_user_id(credentials)

    # Verify habit exists and user has access
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

    # Check if habit is active
    if habit["status"] != HabitStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Habit must be active to check in"
        )

    # Increment count_checkins
    await db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {
            "$inc": {"count_checkins": 1},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    # Get updated habit
    updated_habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    # Calculate progress percentage
    progress_percentage = None
    if updated_habit.get("goal") and updated_habit.get("goal") > 0:
        progress_percentage = (updated_habit.get("count_checkins", 0) / updated_habit["goal"]) * 100
        progress_percentage = min(progress_percentage, 100)  # Cap at 100%

    return {
        "message": "Check-in successful",
        "habit_id": habit_id,
        "count_checkins": updated_habit.get("count_checkins", 0),
        "goal": updated_habit.get("goal"),
        "progress_percentage": progress_percentage
    }


# Helper function (add to your existing habits.py if not already there)
def format_habit_response(habit: dict) -> HabitResponse:
    """Format MongoDB habit document to response model."""
    return HabitResponse(
        id=str(habit["_id"]),
        habit_name=habit["habit_name"],
        habit_type=habit["habit_type"],
        category=habit["category"],
        description=habit.get("description"),
        goal=habit.get("goal"),
        count_checkins=habit.get("count_checkins", 0),
        frequency=habit.get("frequency", "daily"),
        partnership_id=habit.get("partnership_id"),
        status=habit["status"],
        created_by=habit["created_by"],
        created_at=habit["created_at"]
    )
