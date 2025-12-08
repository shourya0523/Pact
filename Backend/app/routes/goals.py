from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Optional

from app.utils.security import decode_access_token
from app.models.goals import (
    UserGoal,
    SetGoalRequest,
    UpdateGoalRequest,
    UserGoalResponse,
    GoalType,
    GoalStatus,
    TimeUnit
)
from config.database import get_database

router = APIRouter(prefix="/goals", tags=["Goals"])
security = HTTPBearer()


# ============================================================================
# AUTHENTICATION
# ============================================================================

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract user ID from JWT token"""
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    return payload.get("sub")


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def format_goal_response(habit_id: str, user_id: str, habit: dict, user_goal: UserGoal) -> UserGoalResponse:
    """Format a UserGoal embedded in a Habit into a response model."""
    return UserGoalResponse(
        user_id=user_id,
        habit_id=habit_id,
        habit_name=habit["habit_name"],
        goal_type=user_goal.goal_type.value,
        goal_name=user_goal.goal_name,
        frequency_count=user_goal.frequency_count,
        frequency_unit=user_goal.frequency_unit.value if user_goal.frequency_unit else None,
        duration_count=user_goal.duration_count,
        duration_unit=user_goal.duration_unit.value if user_goal.duration_unit else None,
        target_value=user_goal.target_value,
        goal_progress=user_goal.goal_progress,
        count_checkins=user_goal.count_checkins,
        total_checkins_required=user_goal.total_checkins_required,
        progress_percentage=user_goal.progress_percentage,
        is_completed=user_goal.is_completed,
        checked_in=user_goal.checked_in,
        goal_status=user_goal.goal_status.value,
        goal_start_date=user_goal.goal_start_date,
        goal_end_date=user_goal.goal_end_date,
        created_at=user_goal.created_at,
        updated_at=user_goal.updated_at
    )


async def verify_habit_access(
        db: AsyncIOMotorDatabase,
        habit_id: str,
        user_id: str
) -> dict:
    """Verify that the habit exists and user has access to it."""
    if not ObjectId.is_valid(habit_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid habit ID format"
        )

    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )

    # Verify user is part of partnership
    if habit.get("partnership_id"):
        partnership = await db.partnerships.find_one({
            "_id": ObjectId(habit["partnership_id"]),
            "$or": [
                {"user_id_1": ObjectId(user_id)},
                {"user_id_2": ObjectId(user_id)}
            ]
        })

        if not partnership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this habit"
            )
    else:
        # For drafts, verify created_by
        if habit.get("created_by") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this habit"
            )

    return habit


def calculate_end_date(start_date: datetime, duration_count: int, duration_unit: TimeUnit) -> datetime:
    """Calculate goal end date based on duration."""
    if duration_unit == TimeUnit.DAY:
        return start_date + timedelta(days=duration_count)
    elif duration_unit == TimeUnit.WEEK:
        return start_date + timedelta(weeks=duration_count)
    elif duration_unit == TimeUnit.MONTH:
        return start_date + timedelta(days=duration_count * 30)
    return start_date


# ============================================================================
# CREATE FREQUENCY GOAL
# ============================================================================

@router.post(
    "/habits/{habit_id}/users/{target_user_id}/goal/frequency",
    response_model=UserGoalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a frequency goal for a user",
    description="Create a frequency-based goal (e.g., '3x per week for 40 weeks'). Automatically calculates end date and total check-ins required."
)
async def create_frequency_goal(
        habit_id: str,
        target_user_id: str,
        goal_data: SetGoalRequest,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Create a frequency goal for a user in a habit.

    - **habit_id**: ID of the habit
    - **target_user_id**: ID of the user for whom the goal is being created
    - **goal_data**: Must include frequency_count, frequency_unit, duration_count, duration_unit

    Example: "Study 3 times per week for 40 weeks"
    - frequency_count: 3
    - frequency_unit: "week"
    - duration_count: 40
    - duration_unit: "week"

    Returns the created goal with progress tracking fields.
    """
    current_user_id = await get_current_user_id(credentials)

    # Verify habit access
    habit = await verify_habit_access(db, habit_id, current_user_id)

    # Verify target user is part of the habit
    if habit.get("partnership_id"):
        partnership = await db.partnerships.find_one({
            "_id": ObjectId(habit["partnership_id"]),
            "$or": [
                {"user_id_1": ObjectId(target_user_id)},
                {"user_id_2": ObjectId(target_user_id)}
            ]
        })

        if not partnership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target user is not part of this habit's partnership"
            )
    else:
        # For drafts, only creator can set goals
        if target_user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only set goals for yourself in draft habits"
            )

    # Check if user already has a goal for this habit
    goals = habit.get("goals", {})
    if target_user_id in goals:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has a goal for this habit. Use PUT to update."
        )

    # Validate frequency goal requirements
    if not all([
        goal_data.frequency_count,
        goal_data.frequency_unit,
        goal_data.duration_count,
        goal_data.duration_unit
    ]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Frequency goals require: frequency_count, frequency_unit, duration_count, duration_unit"
        )

    # Validate matching units
    if goal_data.frequency_unit != goal_data.duration_unit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"frequency_unit ({goal_data.frequency_unit}) must match duration_unit ({goal_data.duration_unit})"
        )

    # Calculate end date
    start_date = datetime.utcnow()
    end_date = calculate_end_date(start_date, goal_data.duration_count, goal_data.duration_unit)

    # Create UserGoal object (FREQUENCY type)
    user_goal = UserGoal(
        goal_type=GoalType.FREQUENCY,
        goal_name=goal_data.goal_name,
        frequency_count=goal_data.frequency_count,
        frequency_unit=goal_data.frequency_unit,
        duration_count=goal_data.duration_count,
        duration_unit=goal_data.duration_unit,
        goal_start_date=start_date,
        goal_end_date=end_date,
        goal_status=GoalStatus.ACTIVE,
        created_at=start_date,
        updated_at=start_date
    )

    # Update habit with new goal
    await db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {
            "$set": {
                f"goals.{target_user_id}": user_goal.model_dump(),
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Fetch updated habit
    updated_habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    return format_goal_response(
        habit_id=habit_id,
        user_id=target_user_id,
        habit=updated_habit,
        user_goal=user_goal
    )


# ============================================================================
# UPDATE FREQUENCY GOAL
# ============================================================================

@router.put(
    "/habits/{habit_id}/users/{target_user_id}/goal/frequency",
    response_model=UserGoalResponse,
    summary="Update a frequency goal",
    description="Update a frequency goal's name or end date. Cannot change frequency/duration values after creation."
)
async def update_frequency_goal(
        habit_id: str,
        target_user_id: str,
        update_data: UpdateGoalRequest,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update a frequency goal for a user.

    - **habit_id**: ID of the habit
    - **target_user_id**: ID of the user whose goal to update
    - **update_data**: Fields to update (goal_name, goal_end_date)

    Note: Cannot change frequency_count, duration_count, or units after creation.
    """
    current_user_id = await get_current_user_id(credentials)

    # Verify habit access
    habit = await verify_habit_access(db, habit_id, current_user_id)

    # Only allow users to update their own goals
    if target_user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only update your own goals"
        )

    # Check if goal exists
    goals = habit.get("goals", {})
    if target_user_id not in goals:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found for this user in this habit"
        )

    # Verify it's a frequency goal
    existing_goal = UserGoal(**goals[target_user_id])
    if existing_goal.goal_type != GoalType.FREQUENCY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint is only for frequency goals. Use /goal/completion for completion goals."
        )

    # Prepare update
    update_dict = {}
    if update_data.goal_name is not None:
        update_dict[f"goals.{target_user_id}.goal_name"] = update_data.goal_name
    if update_data.goal_end_date is not None:
        update_dict[f"goals.{target_user_id}.goal_end_date"] = update_data.goal_end_date

    update_dict[f"goals.{target_user_id}.updated_at"] = datetime.utcnow()

    # Update habit
    await db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {"$set": update_dict}
    )

    # Fetch updated habit
    updated_habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
    user_goal = UserGoal(**updated_habit["goals"][target_user_id])

    return format_goal_response(
        habit_id=habit_id,
        user_id=target_user_id,
        habit=updated_habit,
        user_goal=user_goal
    )


# ============================================================================
# CREATE GENERIC GOAL (FOR COMPLETION GOALS - YOUR TEAMMATE'S ENDPOINT)
# ============================================================================

@router.post(
    "/habits/{habit_id}/users/{target_user_id}/goal",
    response_model=UserGoalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new goal for a user in a habit",
    description="Create a new goal (frequency or completion type) for a specific user within a habit. Use /goal/frequency for frequency goals."
)
async def create_user_goal(
        habit_id: str,
        target_user_id: str,
        goal_data: SetGoalRequest,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Create a new goal for a user in a habit.

    - **habit_id**: ID of the habit
    - **target_user_id**: ID of the user for whom the goal is being created
    - **goal_data**: Goal configuration (type, name, frequency details, etc.)

    Returns the created goal with progress tracking fields.
    """
    current_user_id = await get_current_user_id(credentials)

    # Verify habit access
    habit = await verify_habit_access(db, habit_id, current_user_id)

    # Verify target user is part of the habit
    if habit.get("partnership_id"):
        partnership = await db.partnerships.find_one({
            "_id": ObjectId(habit["partnership_id"]),
            "$or": [
                {"user_id_1": ObjectId(target_user_id)},
                {"user_id_2": ObjectId(target_user_id)}
            ]
        })

        if not partnership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target user is not part of this habit's partnership"
            )
    else:
        # For drafts, only creator can set goals
        if target_user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only set goals for yourself in draft habits"
            )

    # Check if user already has a goal for this habit
    goals = habit.get("goals", {})
    if target_user_id in goals:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has a goal for this habit. Use PUT to update."
        )

    # Create UserGoal object
    user_goal = UserGoal(
        goal_type=goal_data.goal_type,
        goal_name=goal_data.goal_name,
        frequency_count=goal_data.frequency_count,
        frequency_unit=goal_data.frequency_unit,
        duration_count=goal_data.duration_count,
        duration_unit=goal_data.duration_unit,
        target_value=goal_data.target_value,
        goal_start_date=datetime.utcnow(),
        goal_status=GoalStatus.ACTIVE,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    # Update habit with new goal
    await db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {
            "$set": {
                f"goals.{target_user_id}": user_goal.model_dump(),
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Fetch updated habit
    updated_habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    return format_goal_response(
        habit_id=habit_id,
        user_id=target_user_id,
        habit=updated_habit,
        user_goal=user_goal
    )


@router.post(
    "/habits/{habit_id}/users/{target_user_id}/goal/completion",
    response_model=UserGoalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a completion goal",
    description="Create a new completion goal for a specfic user within a specific habit."
)
async def create_user_goal_completion(
        habit_id: str,
        target_user_id: str,
        goal_data: SetGoalRequest,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    current_user_id = await get_current_user_id(credentials)

    request = SetGoalRequest(
        goal_type=GoalType.COMPLETION,
        goal_name=goal_data.goal_name,
        frequency_count=None,
        frequency_unit=None,
        duration_count=None,
        duration_unit=None,
        target_value=goal_data.target_value
    )

    return await create_user_goal(
        habit_id=habit_id,
        target_user_id=target_user_id,
        goal_data=request,
        credentials=credentials,
        db=db
    )


# ============================================================================
# READ GOAL(S)
# ============================================================================

@router.get(
    "/habits/{habit_id}/users/{target_user_id}/goal",
    response_model=UserGoalResponse,
    summary="Get a specific user's goal for a habit",
    description="Retrieve the goal details for a specific user within a habit, including progress tracking."
)
async def get_user_goal(
        habit_id: str,
        target_user_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get a user's goal for a specific habit.

    - **habit_id**: ID of the habit
    - **target_user_id**: ID of the user whose goal to retrieve

    Returns the goal with current progress and status.
    """
    current_user_id = await get_current_user_id(credentials)

    # Verify habit access
    habit = await verify_habit_access(db, habit_id, current_user_id)

    # Get goals dict
    goals = habit.get("goals", {})

    if target_user_id not in goals:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found for this user in this habit"
        )

    # Parse UserGoal
    user_goal = UserGoal(**goals[target_user_id])

    return format_goal_response(
        habit_id=habit_id,
        user_id=target_user_id,
        habit=habit,
        user_goal=user_goal
    )


@router.get(
    "/habits/{habit_id}/goals",
    response_model=List[UserGoalResponse],
    summary="Get all goals for a habit",
    description="Retrieve all user goals associated with a specific habit."
)
async def get_habit_goals(
        habit_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get all goals for a habit (both users if partnership).

    - **habit_id**: ID of the habit

    Returns a list of all goals for the habit.
    """
    current_user_id = await get_current_user_id(credentials)

    # Verify habit access
    habit = await verify_habit_access(db, habit_id, current_user_id)

    # Get all goals
    goals = habit.get("goals", {})

    if not goals:
        return []

    # Format all goals
    responses = []
    for user_id, goal_data in goals.items():
        user_goal = UserGoal(**goal_data)
        responses.append(
            format_goal_response(
                habit_id=habit_id,
                user_id=user_id,
                habit=habit,
                user_goal=user_goal
            )
        )

    return responses


@router.get(
    "/users/me/goals",
    response_model=List[UserGoalResponse],
    summary="Get all goals for current user and their partners",
    description="Retrieve all goals for the authenticated user AND their partners across all habits in active partnerships."
)
async def get_my_goals(
        active_only: bool = True,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get all goals for the current user AND their partners across all habits.

    - **active_only**: If true, only return active goals (default: true)

    Returns a list of all goals for the current user and their partners.
    """
    current_user_id = await get_current_user_id(credentials)

    # Find all partnerships the user is in
    partnerships = await db.partnerships.find({
        "$or": [
            {"user_id_1": ObjectId(current_user_id)},
            {"user_id_2": ObjectId(current_user_id)}
        ],
        "status": "active"
    }).to_list(length=None)

    # Get all partner user IDs
    partner_ids = []
    for partnership in partnerships:
        user_id_1 = str(partnership["user_id_1"])
        user_id_2 = str(partnership["user_id_2"])

        if user_id_1 == current_user_id:
            partner_ids.append(user_id_2)
        else:
            partner_ids.append(user_id_1)

    # Include current user and all partners
    all_user_ids = [current_user_id] + partner_ids

    # Build query to find habits where any of these users have goals
    query = {
        "$or": [
            {f"goals.{user_id}": {"$exists": True}}
            for user_id in all_user_ids
        ]
    }

    # Find all habits with goals for these users
    habits = await db.habits.find(query).to_list(length=None)

    responses = []
    for habit in habits:
        goals = habit.get("goals", {})

        # Process goals for all users in our list
        for user_id in all_user_ids:
            if user_id in goals:
                goal_data = goals[user_id]
                user_goal = UserGoal(**goal_data)

                # Filter by active status if requested
                if active_only and user_goal.goal_status != GoalStatus.ACTIVE:
                    continue

                responses.append(
                    format_goal_response(
                        habit_id=str(habit["_id"]),
                        user_id=user_id,
                        habit=habit,
                        user_goal=user_goal
                    )
                )

    return responses


# ============================================================================
# UPDATE GENERIC GOAL
# ============================================================================

@router.put(
    "/habits/{habit_id}/users/{target_user_id}/goal",
    response_model=UserGoalResponse,
    summary="Update a user's goal",
    description="Update specific fields of a user's goal within a habit. Progress and completion fields are read-only."
)
async def update_user_goal(
        habit_id: str,
        target_user_id: str,
        update_data: UpdateGoalRequest,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update a user's goal for a habit.

    - **habit_id**: ID of the habit
    - **target_user_id**: ID of the user whose goal to update
    - **update_data**: Fields to update (goal_name, goal_end_date)

    Note: Progress fields (goal_progress, count_checkins, etc.) are calculated automatically.
    """
    current_user_id = await get_current_user_id(credentials)

    # Verify habit access
    habit = await verify_habit_access(db, habit_id, current_user_id)

    # Only allow users to update their own goals
    if target_user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only update your own goals"
        )

    # Check if goal exists
    goals = habit.get("goals", {})
    if target_user_id not in goals:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found for this user in this habit"
        )

    # Prepare update
    update_dict = {}
    if update_data.goal_name is not None:
        update_dict[f"goals.{target_user_id}.goal_name"] = update_data.goal_name
    if update_data.goal_end_date is not None:
        update_dict[f"goals.{target_user_id}.goal_end_date"] = update_data.goal_end_date

    update_dict[f"goals.{target_user_id}.updated_at"] = datetime.utcnow()

    # Update habit
    await db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {"$set": update_dict}
    )

    # Fetch updated habit
    updated_habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
    user_goal = UserGoal(**updated_habit["goals"][target_user_id])

    return format_goal_response(
        habit_id=habit_id,
        user_id=target_user_id,
        habit=updated_habit,
        user_goal=user_goal
    )


@router.put(
    "/habits/{habit_id}/users/{target_user_id}/goal/completion",
    response_model=UserGoalResponse,
    summary="Update a user's goal",
    description="Update specific fields of a user's completion goal within a habit. Progress and completion fields are read-only."
)
async def update_user_goal_completion(
        habit_id: str,
        target_user_id: str,
        update_data: UpdateGoalRequest,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    current_user_id = await get_current_user_id(credentials)

    habit = await verify_habit_access(db, habit_id, current_user_id)

    goals = habit.get("goals", {})
    if target_user_id not in goals:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found for this user in this habit"
        )

    if goals[target_user_id].get("goal_type") != "completion":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint can only update completion goals"
        )

    return await update_user_goal(
        habit_id=habit_id,
        target_user_id=target_user_id,
        update_data=update_data,
        credentials=credentials,
        db=db
    )


# ============================================================================
# DELETE GOAL
# ============================================================================

@router.delete(
    "/habits/{habit_id}/users/{target_user_id}/goal",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user's goal",
    description="Remove a user's goal from a habit. This permanently deletes the goal data."
)
async def delete_user_goal(
        habit_id: str,
        target_user_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Delete a user's goal for a habit.

    - **habit_id**: ID of the habit
    - **target_user_id**: ID of the user whose goal to delete

    Note: This permanently removes the goal. Consider using status updates instead for historical tracking.
    """
    current_user_id = await get_current_user_id(credentials)

    # Verify habit access
    habit = await verify_habit_access(db, habit_id, current_user_id)

    # Only allow users to delete their own goals
    if target_user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete your own goals"
        )

    # Check if goal exists
    goals = habit.get("goals", {})
    if target_user_id not in goals:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found for this user in this habit"
        )

    # Remove goal from habit
    await db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {
            "$unset": {f"goals.{target_user_id}": ""},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )

    return None


# ============================================================================
# GOAL STATUS MANAGEMENT
# ============================================================================

@router.patch(
    "/habits/{habit_id}/users/{target_user_id}/goal/status",
    response_model=UserGoalResponse,
    summary="Update goal status",
    description="Change the status of a user's goal (e.g., mark as completed, deactivate)."
)
async def update_goal_status(
        habit_id: str,
        target_user_id: str,
        new_status: GoalStatus,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update the status of a user's goal.

    - **habit_id**: ID of the habit
    - **target_user_id**: ID of the user whose goal status to update
    - **new_status**: New status (active/completed)

    Returns the updated goal.
    """
    current_user_id = await get_current_user_id(credentials)

    # Verify habit access
    habit = await verify_habit_access(db, habit_id, current_user_id)

    # Only allow users to update their own goal status
    if target_user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only update your own goal status"
        )

    # Check if goal exists
    goals = habit.get("goals", {})
    if target_user_id not in goals:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found for this user in this habit"
        )

    # Update status
    await db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {
            "$set": {
                f"goals.{target_user_id}.goal_status": new_status.value,
                f"goals.{target_user_id}.updated_at": datetime.utcnow()
            }
        }
    )

    # Fetch updated habit
    updated_habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
    user_goal = UserGoal(**updated_habit["goals"][target_user_id])

    return format_goal_response(
        habit_id=habit_id,
        user_id=target_user_id,
        habit=updated_habit,
        user_goal=user_goal
    )