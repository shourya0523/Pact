"""
Streak Calculation Endpoints

Provides endpoints for:
- Calculating current streak for a habit
- Getting streak details for a partnership
- Forcing streak recalculation
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.security import decode_access_token
from config.database import get_database
from app.services.streak_service import StreakCalculationService
from bson import ObjectId
from datetime import datetime, date, timedelta
from typing import List, Optional

router = APIRouter(prefix="/streaks", tags=["Streaks"])
security = HTTPBearer()


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


@router.get("/habit/{habit_id}", response_model=dict)
async def get_habit_streak(
    habit_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get current streak for a habit.
    
    Returns:
    - current_streak: Number of consecutive days streak is active
    - longest_streak: All-time longest streak
    - streak_start_date: When current streak started
    - last_completed_date: Last day habit was completed by both partners
    - is_on_track: Whether both partners completed today
    """
    db = get_database()
    user_id = await get_current_user_id(credentials)
    
    # Verify habit exists
    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )
    
    # Verify user has access to this habit's partnership
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
    
    # Calculate streak
    streak_data = await StreakCalculationService.calculate_streak_for_habit(
        db,
        habit_id,
        habit["partnership_id"]
    )
    
    if "error" in streak_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=streak_data["error"]
        )
    
    return {
        "habit_id": habit_id,
        "partnership_id": habit["partnership_id"],
        "habit_name": habit["habit_name"],
        "current_streak": streak_data["current_streak"],
        "longest_streak": streak_data["longest_streak"],
        "streak_start_date": streak_data["streak_start_date"],
        "last_completed_date": streak_data["last_completed_date"],
        "is_on_track": streak_data["is_on_track"]
    }


@router.get("/partnership/{partnership_id}", response_model=list)
async def get_partnership_streaks(
    partnership_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get all active habit streaks for a partnership.
    
    Returns list of streaks for each active habit with both partners' completion status.
    """
    db = get_database()
    user_id = await get_current_user_id(credentials)
    
    # Verify partnership exists and user has access
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(partnership_id),
        "$or": [
            {"user_id_1": user_id},
            {"user_id_2": user_id}
        ]
    })
    
    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found or access denied"
        )
    
    # Get all active habits
    habits = await db.habits.find({
        "partnership_id": partnership_id,
        "status": "active"
    }).to_list(length=None)
    
    streaks_list = []
    
    for habit in habits:
        streak_data = await StreakCalculationService.calculate_streak_for_habit(
            db,
            str(habit["_id"]),
            partnership_id
        )
        
        if "error" not in streak_data:
            streaks_list.append({
                "habit_id": str(habit["_id"]),
                "habit_name": habit["habit_name"],
                "current_streak": streak_data["current_streak"],
                "longest_streak": streak_data["longest_streak"],
                "streak_start_date": streak_data["streak_start_date"],
                "last_completed_date": streak_data["last_completed_date"],
                "is_on_track": streak_data["is_on_track"]
            })
    
    return streaks_list


@router.post("/habit/{habit_id}/recalculate", response_model=dict)
async def recalculate_and_update_habit_streak(
    habit_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Force recalculation of streak for a habit and update the persistent cache
    in the `streaks` collection (not the `habits` document).
    """
    db = get_database()
    user_id = await get_current_user_id(credentials)
    
    # Verify habit exists
    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )
    
    # Verify user has access
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
    
    # Recompute from logs and upsert into persistent cache
    recomputed = await StreakCalculationService.recompute_streak_from_logs(
        db, habit_id, habit["partnership_id"]
    )
    await StreakCalculationService.upsert_streaks(
        db, habit_id, habit["partnership_id"], recomputed
    )
    StreakCalculationService.invalidate_mem_cache(habit_id)
    
    return {
        "habit_id": habit_id,
        "message": "Streak recalculated and cached successfully",
        "current_streak": recomputed["current_streak"],
        "longest_streak": recomputed["longest_streak"],
        "streak_start_date": recomputed["streak_started_at"],
        "last_completed_date": recomputed["last_both_completed_date"],
        "is_on_track": (recomputed["last_both_completed_date"] == date.today())
    }


@router.get("/habit/{habit_id}/check-miss", response_model=dict)
async def check_streak_miss(
    habit_id: str,
    check_date: Optional[str] = Query(None, description="Date to check (YYYY-MM-DD), defaults to today"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Check if a user missed completing a habit on a specific day.
    
    Returns:
    - streak_reset: True if streak was broken (user missed)
    - reason: Explanation of what happened
    - reset_date: Date when the miss occurred
    """
    db = get_database()
    user_id = await get_current_user_id(credentials)
    
    # Verify habit exists
    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )
    
    # Verify user has access
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
    
    # Parse date or use today
    if check_date:
        try:
            check_dt = datetime.fromisoformat(check_date).date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    else:
        check_dt = datetime.utcnow().date()
    
    # Check if missed
    result = await StreakCalculationService.check_and_reset_streak_if_missed(
        db,
        habit_id,
        habit["partnership_id"],
        check_dt
    )
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"]
        )
    
    return result


@router.get("/habit/{habit_id}/history", response_model=dict)
async def get_streak_history(
    habit_id: str,
    limit: int = Query(30, ge=1, le=365, description="Number of days to include in history"),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Get detailed streak history for a habit.
    
    Returns completion status for the last N days, showing:
    - user1_completed: Whether partner 1 completed
    - user2_completed: Whether partner 2 completed
    - both_completed: Whether both completed (counts toward streak)
    """
    db = get_database()
    user_id = await get_current_user_id(credentials)
    
    # Verify habit exists
    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )
    
    # Verify user has access
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
    
    user1_id = partnership["user_id_1"]
    user2_id = partnership["user_id_2"]
    
    # Get logs for the last N days
    start_date = date.today() - timedelta(days=limit)
    
    logs = await db.habit_logs.find({
        "habit_id": habit_id,
        "date": {"$gte": start_date}
    }).sort("date", -1).to_list(length=None)
    
    # Group by date
    logs_by_date = {}
    for log in logs:
        date_key = log["date"]
        if date_key not in logs_by_date:
            logs_by_date[date_key] = {
                user1_id: False,
                user2_id: False
            }
        if log["completed"]:
            logs_by_date[date_key][log["user_id"]] = True
    
    # Build history
    history = []
    for i in range(limit):
        current_date = date.today() - timedelta(days=i)
        entry = logs_by_date.get(current_date, {
            user1_id: False,
            user2_id: False
        })
        
        history.append({
            "date": current_date.isoformat(),
            "user1_completed": entry.get(user1_id, False),
            "user2_completed": entry.get(user2_id, False),
            "both_completed": entry.get(user1_id, False) and entry.get(user2_id, False)
        })
    
    return {
        "habit_id": habit_id,
        "partnership_id": habit["partnership_id"],
        "history": history,
        "period_days": limit
    }
