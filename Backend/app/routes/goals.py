from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
from typing import List, Optional

from app.dependencies.auth import get_current_user_id
from app.models.goals import (
    UserGoal,
    SetGoalRequest,
    UpdateGoalRequest,
    UserGoalResponse,
    GoalType,
    GoalStatus
)
from config.database import get_database

router = APIRouter(prefix="/goals", tags=["Goals"])


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


# ============================================================================
# CREATE GOAL
# ============================================================================

@router.post(
    "/habits/{habit_id}/users/{target_user_id}/goal",
    response_model=UserGoalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new goal for a user in a habit",
    description="Create a new goal (frequency or completion type) for a specific user within a habit. Each user can only have one active goal per habit."
)
async def create_user_goal(
        habit_id: str,
        target_user_id: str,
        goal_data: SetGoalRequest,
        current_user_id: str = Depends(get_current_user_id),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Create a new goal for a user in a habit.

    - **habit_id**: ID of the habit
    - **target_user_id**: ID of the user for whom the goal is being created
    - **goal_data**: Goal configuration (type, name, frequency details, etc.)

    Returns the created goal with progress tracking fields.
    """
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
        current_user_id: str = Depends(get_current_user_id),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get a user's goal for a specific habit.

    - **habit_id**: ID of the habit
    - **target_user_id**: ID of the user whose goal to retrieve

    Returns the goal with current progress and status.
    """
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
        current_user_id: str = Depends(get_current_user_id),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get all goals for a habit (both users if partnership).

    - **habit_id**: ID of the habit

    Returns a list of all goals for the habit.
    """
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
    summary="Get all goals for current user",
    description="Retrieve all goals for the authenticated user across all their habits."
)
async def get_my_goals(
        active_only: bool = True,
        current_user_id: str = Depends(get_current_user_id),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get all goals for the current user across all habits.

    - **active_only**: If true, only return active goals (default: true)

    Returns a list of all goals for the current user.
    """
    # Find all habits where user has goals
    habits = await db.habits.find({
        f"goals.{current_user_id}": {"$exists": True}
    }).to_list(length=None)

    responses = []
    for habit in habits:
        goal_data = habit["goals"][current_user_id]
        user_goal = UserGoal(**goal_data)

        # Filter by active status if requested
        if active_only and user_goal.goal_status != GoalStatus.ACTIVE:
            continue

        responses.append(
            format_goal_response(
                habit_id=str(habit["_id"]),
                user_id=current_user_id,
                habit=habit,
                user_goal=user_goal
            )
        )

    return responses


# UPDATE GOAL

@router.put(
    "/habits/{habit_id}/users/{target_user_id}/goal-completion",
    response_model=UserGoalResponse,
    summary="Update a user's completion goal",
    description="Update specific fields of a user's completion goal within a habit. Progress and completion fields are read-only."
)
async def update_user_goal(
        habit_id: str,
        target_user_id: str,
        update_data: UpdateGoalRequest,
        current_user_id: str = Depends(get_current_user_id),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update a user's goal for a habit.

    - **habit_id**: ID of the habit
    - **target_user_id**: ID of the user whose goal to update
    - **update_data**: Fields to update (goal_name, goal_end_date)

    Note: Progress fields (goal_progress, count_checkins, etc.) are calculated automatically.
    """
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
    description="Update specific fields of a user's goal within a habit. Progress and completion fields are read-only."   
)

# DELETE GOAL

@router.delete(
    "/habits/{habit_id}/users/{target_user_id}/goal",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user's goal",
    description="Remove a user's goal from a habit. This permanently deletes the goal data."
)
async def delete_user_goal(
        habit_id: str,
        target_user_id: str,
        current_user_id: str = Depends(get_current_user_id),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Delete a user's goal for a habit.

    - **habit_id**: ID of the habit
    - **target_user_id**: ID of the user whose goal to delete

    Note: This permanently removes the goal. Consider using status updates instead for historical tracking.
    """
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


# GOAL STATUS MANAGEMENT

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
        current_user_id: str = Depends(get_current_user_id),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update the status of a user's goal.

    - **habit_id**: ID of the habit
    - **target_user_id**: ID of the user whose goal status to update
    - **new_status**: New status (active/completed)

    Returns the updated goal.
    """
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