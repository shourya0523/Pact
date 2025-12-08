
from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.habit_log import (
    HabitLogCreate,
    HabitLogResponse,
    TodayLogStatus,
    PartnershipTodayStatus
)
from app.utils.security import decode_access_token
from app.services.streak_service import StreakCalculationService
from app.models.goals import GoalStatus
from app.utils.notification_helpers import notify_partner_on_checkin
from config.database import get_database
from bson import ObjectId
from datetime import datetime, date, timedelta
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.services.notification_service import notification_service

async def check_goal_milestones(
    db,
    habit_id: str,
    user_id: str,
    habit: dict,
    partnership_id: str
):
    """
    Check if user reached a goal milestone and send notif
    
    Milestones: 25%, 50%, 75%, 100%
    """
    # Check if user has a goal for this habit
    goals = habit.get("goals", {})
    if user_id not in goals:
        return
    
    goal_data = goals[user_id]
    
    # Calculate progress percentage
    count_checkins = goal_data.get("count_checkins", 0)
    total_required = goal_data.get("total_checkins_required")
    
    if not total_required or total_required == 0:
        return
    
    # Calculate current and previous progress percentages
    current_progress = (count_checkins / total_required) * 100
    previous_progress = ((count_checkins - 1) / total_required) * 100 if count_checkins > 0 else 0
    
    # Check which milestone was just crossed
    milestones = [25, 50, 75, 100]
    for milestone in milestones:
        if previous_progress < milestone <= current_progress:
            # Milestone is reached and will send notif
            await notification_service.send_goal_milestone_notification(
                user_id=user_id,
                goal_name=goal_data.get("goal_name", "Your goal"),
                milestone_percentage=milestone,
                habit_name=habit.get("habit_name", "habit"),
                partnership_id=partnership_id
            )
            print(f"🎯 Goal milestone notification sent: {milestone}% for user {user_id}")
            break  # Only send one notif for each check-in

router = APIRouter(tags=["Habit Logging"])
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


@router.post("/habits/{habit_id}/log", response_model=HabitLogResponse, status_code=status.HTTP_201_CREATED)
async def log_habit_completion(
        habit_id: str,
        log_data: HabitLogCreate,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Log daily habit completion"""
    user_id = await get_current_user_id(credentials)

    # Verify habit exists and user has access
    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )

    # FIXED: Handle partnership_id as both ObjectId and string
    partnership_id = habit.get("partnership_id")
    if isinstance(partnership_id, str):
        partnership_id = ObjectId(partnership_id)

    # Verify user is part of partnership
    partnership = await db.partnerships.find_one({
        "_id": partnership_id,
        "$or": [
            {"user_id_1": ObjectId(user_id)},
            {"user_id_2": ObjectId(user_id)}
        ]
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Get today's date as datetime (MongoDB compatible)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Check if already logged today
    existing_log = await db.habit_logs.find_one({
        "habit_id": habit_id,
        "user_id": user_id,
        "log_date": today
    })

    if existing_log:
        # Update existing log
        update_data = {
            "completed": log_data.completed,
            "timestamp": datetime.utcnow()
        }
        # Include value if provided (for completion goals)
        if log_data.value is not None:
            update_data["value"] = log_data.value
        
        await db.habit_logs.update_one(
            {"_id": existing_log["_id"]},
            {"$set": update_data}
        )
        log_id = existing_log["_id"]
    else:
        # Create new log
        log_entry = {
            "habit_id": habit_id,
            "user_id": user_id,
            "completed": log_data.completed,
            "log_date": today,
            "timestamp": datetime.utcnow()
        }
        # Include value if provided (for completion goals)
        if log_data.value is not None:
            log_entry["value"] = log_data.value

        result = await db.habit_logs.insert_one(log_entry)
        log_id = result.inserted_id

    # Check if both partners completed - update Partnership-level points (legacy)
    await update_partnership_streak(db, habit_id, partnership_id, today)

    # Recompute streak from logs and upsert into streaks (persistent cache)
    recomputed = await StreakCalculationService.recompute_streak_from_logs(
        db, habit_id, str(partnership_id)
    )
    await StreakCalculationService.upsert_streaks(
        db, habit_id, str(partnership_id), recomputed
    )
    # Invalidate in-memory cache for this habit so next read is fresh
    StreakCalculationService.invalidate_mem_cache(habit_id)

    # Notify partner about check-in (only if completed is True)
    if log_data.completed:
        try:
            await notify_partner_on_checkin(db, habit_id, user_id)
        except Exception as e:
            # Don't fail the check-in if notification fails
            print(f"Warning: Failed to send partner notification: {e}")

    # Update goal progress for this user if they have a goal on this habit
    if log_data.completed and habit.get("goals") and user_id in habit["goals"]:
        goal_data = habit["goals"][user_id]
        goal_type = goal_data.get("goal_type")
        updates = {
            f"goals.{user_id}.checked_in": True,
            f"goals.{user_id}.updated_at": datetime.utcnow(),
        }

        if goal_type == "completion" and goal_data.get("target_value") is not None:
            # For completion goals with target_value, accumulate values from logs
            # Sum all values from completed logs for this user
            logs = await db.habit_logs.find(
                {"habit_id": habit_id, "user_id": user_id, "completed": True},
                {"value": 1}
            ).to_list(length=None)
            
            accumulated_value = sum(log.get("value", 0) or 0 for log in logs)
            total_checkins_for_user = len(logs)
            
            updates[f"goals.{user_id}.count_checkins"] = total_checkins_for_user
            updates[f"goals.{user_id}.goal_progress"] = accumulated_value
            
            # Check if goal is completed (accumulated value >= target)
            if accumulated_value >= goal_data.get("target_value", 0):
                updates[f"goals.{user_id}.goal_status"] = GoalStatus.COMPLETED.value
        else:
            # For frequency goals or legacy completion goals, count check-ins
            total_checkins_for_user = await db.habit_logs.count_documents({
                "habit_id": habit_id,
                "user_id": user_id,
                "completed": True
            })
            
            updates[f"goals.{user_id}.count_checkins"] = total_checkins_for_user
            updates[f"goals.{user_id}.goal_progress"] = total_checkins_for_user

        # Compute total required for frequency/completion goals and persist it
        freq_count = goal_data.get("frequency_count")
        dur_count = goal_data.get("duration_count")
        total_required = None
        if goal_type == "frequency" and freq_count and dur_count:
            total_required = freq_count * dur_count
        elif goal_type == "completion":
            total_required = 1

        if total_required is not None:
            updates[f"goals.{user_id}.total_checkins_required"] = total_required

        if total_required is not None and total_required > 0 and total_checkins_for_user >= total_required:
            updates[f"goals.{user_id}.goal_status"] = GoalStatus.COMPLETED.value

        await db.habits.update_one(
            {"_id": ObjectId(habit_id)},
            {"$set": updates}
        )
        # Refresh habit snapshot for downstream milestone checks
        habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    # Get the log
    log = await db.habit_logs.find_one({"_id": log_id})

    # Get current streak value from persistent cache
    current_streak_doc = await db.streaks.find_one({"habit_id": ObjectId(habit_id)})
    current_streak_val = 0 if not current_streak_doc else current_streak_doc.get("current_streak", 0)

    # Send notif to partner when user checks in
    if log_data.completed and partnership_id:
        # get partner's info
        partnership = await db.partnerships.find_one({"_id": partnership_id})
        if partnership:
            # find who the partner is
            partner_id = None
            if str(partnership["user_id_1"]) == user_id:
                partner_id = str(partnership["user_id_2"])
            else:
                partner_id = str(partnership["user_id_1"])
            
            # Get current user's info for notification
            current_user = await db.users.find_one({"_id": ObjectId(user_id)})
            current_username = current_user.get("username", "Your partner") if current_user else "Your partner"
            
            # send notif to partner
            await notification_service.send_partner_checkin_notification(
                user_id=partner_id,
                partner_username=current_username,
                habit_name=habit["habit_name"],
                partnership_id=str(partnership_id)
            )
    # Check for goal milestones and send notif if reached
    if log_data.completed and partnership_id:
        await check_goal_milestones(
            db=db,
            habit_id=habit_id,
            user_id=user_id,
            habit=habit,
            partnership_id=str(partnership_id)
        )

    # Return response
    return HabitLogResponse(
        id=str(log["_id"]),
        habit_id=log["habit_id"],
        user_id=log["user_id"],
        completed=log["completed"],
        date=log["log_date"].date().isoformat(),
        logged_at=log.get("timestamp", log["log_date"]),
        current_streak=current_streak_val
    )


async def update_partnership_streak(db, habit_id: str, partnership_id: ObjectId, check_date: datetime):
    """Update partnership streak if both partners completed"""

    # Get both partner IDs
    partnership = await db.partnerships.find_one({"_id": partnership_id})
    user1_id = str(partnership["user_id_1"])
    user2_id = str(partnership["user_id_2"])

    # Check if both completed today
    logs_today = await db.habit_logs.find({
        "habit_id": habit_id,
        "log_date": check_date,
        "completed": True
    }).to_list(2)

    logged_users = {log["user_id"] for log in logs_today}

    if user1_id in logged_users and user2_id in logged_users:
        # Both completed! Update streak
        current_streak = partnership.get("current_streak", 0)

        # Check if yesterday was also completed (for streak continuation)
        yesterday = check_date - timedelta(days=1)
        logs_yesterday = await db.habit_logs.find({
            "habit_id": habit_id,
            "log_date": yesterday,
            "completed": True
        }).to_list(2)

        logged_yesterday = {log["user_id"] for log in logs_yesterday}

        if user1_id in logged_yesterday and user2_id in logged_yesterday:
            # Streak continues
            new_streak = current_streak + 1
        else:
            # New streak starts
            new_streak = 1

        await db.partnerships.update_one(
            {"_id": partnership_id},
            {
                "$set": {
                    "current_streak": new_streak,
                    "updated_at": datetime.utcnow()
                },
                "$inc": {"total_points": 10}
            }
        )


@router.get("/habits/{habit_id}/logs", response_model=List[HabitLogResponse])
async def get_habit_logs(
        habit_id: str,
        start_date: Optional[str] = Query(None),
        end_date: Optional[str] = Query(None),
        user_id_filter: Optional[str] = Query(None, alias="user_id"),
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get habit log history with optional filters"""
    user_id = await get_current_user_id(credentials)

    # Verify habit exists and user has access
    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )

    # FIXED: Handle partnership_id as both ObjectId and string
    partnership_id = habit.get("partnership_id")
    if partnership_id:
        # Convert to ObjectId if it's a string
        if isinstance(partnership_id, str):
            partnership_id = ObjectId(partnership_id)

        # Verify user is part of partnership
        partnership = await db.partnerships.find_one({
            "_id": partnership_id,
            "$or": [
                {"user_id_1": ObjectId(user_id)},
                {"user_id_2": ObjectId(user_id)}
            ]
        })

        if not partnership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

    # Build query
    query = {"habit_id": habit_id}

    if start_date:
        query["log_date"] = query.get("log_date", {})
        query["log_date"]["$gte"] = datetime.fromisoformat(start_date)

    if end_date:
        query["log_date"] = query.get("log_date", {})
        query["log_date"]["$lte"] = datetime.fromisoformat(end_date)

    if user_id_filter:
        query["user_id"] = user_id_filter

    # Get logs
    logs = await db.habit_logs.find(query).sort("log_date", -1).to_list(1000)

    # Convert logs to response format
    return [
        HabitLogResponse(
            id=str(log["_id"]),
            habit_id=str(log["habit_id"]),
            user_id=str(log["user_id"]),
            completed=log["completed"],
            date=log["log_date"].date().isoformat(),
            logged_at=log.get("timestamp", log["log_date"]),
            current_streak=0
        )
        for log in logs
    ]


@router.get("/habits/{habit_id}/logs/today", response_model=TodayLogStatus)
async def get_today_log_status(
        habit_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get today's log status for both partners"""
    user_id = await get_current_user_id(credentials)

    # Verify habit exists and user has access
    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})

    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )

    # FIXED: Handle partnership_id as both ObjectId and string
    partnership_id = habit.get("partnership_id")
    if isinstance(partnership_id, str):
        partnership_id = ObjectId(partnership_id)

    # Get partnership
    partnership = await db.partnerships.find_one({
        "_id": partnership_id,
        "$or": [
            {"user_id_1": ObjectId(user_id)},
            {"user_id_2": ObjectId(user_id)}
        ]
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    user1_id = str(partnership["user_id_1"])
    user2_id = str(partnership["user_id_2"])

    # Get today's date as datetime (MongoDB compatible)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Get today's logs for both users
    logs = await db.habit_logs.find({
        "habit_id": habit_id,
        "log_date": today
    }).to_list(2)

    user_logs = {}
    for log in logs:
        user_logs[log["user_id"]] = {
            "completed": log["completed"],
            "logged": True
        }

    # Fill in missing users
    if user1_id not in user_logs:
        user_logs[user1_id] = {"completed": False, "logged": False}
    if user2_id not in user_logs:
        user_logs[user2_id] = {"completed": False, "logged": False}

    both_completed = (
            user_logs[user1_id]["completed"] and
            user_logs[user2_id]["completed"]
    )

    return TodayLogStatus(
        habit_id=habit_id,
        habit_name=habit["habit_name"],
        user_logs=user_logs,
        both_completed=both_completed
    )


@router.get("/partnerships/{partnership_id}/logs/today", response_model=PartnershipTodayStatus)
async def get_partnership_today_status(
        partnership_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all habits' completion status for today"""
    user_id = await get_current_user_id(credentials)

    # Verify partnership and access
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(partnership_id),
        "$or": [
            {"user_id_1": ObjectId(user_id)},
            {"user_id_2": ObjectId(user_id)}
        ]
    })

    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found"
        )

    user1_id = str(partnership["user_id_1"])
    user2_id = str(partnership["user_id_2"])

    # Get all active habits for this partnership - FIXED: Handle both ObjectId and string
    habits = await db.habits.find({
        "$or": [
            {"partnership_id": ObjectId(partnership_id)},
            {"partnership_id": partnership_id}
        ],
        "status": "active"
    }).to_list(100)

    # Get today's date as datetime (MongoDB compatible)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # Get all today's logs for these habits
    habit_ids = [str(h["_id"]) for h in habits]
    logs = await db.habit_logs.find({
        "habit_id": {"$in": habit_ids},
        "log_date": today
    }).to_list(1000)

    # Organize logs by habit
    logs_by_habit = {}
    for log in logs:
        if log["habit_id"] not in logs_by_habit:
            logs_by_habit[log["habit_id"]] = {}
        logs_by_habit[log["habit_id"]][log["user_id"]] = log

    # Build response
    habits_status = []
    both_completed_count = 0
    user1_completed = 0
    user2_completed = 0

    for habit in habits:
        habit_id = str(habit["_id"])
        habit_logs = logs_by_habit.get(habit_id, {})

        user_logs = {}

        # User 1
        if user1_id in habit_logs:
            user_logs[user1_id] = {
                "completed": habit_logs[user1_id]["completed"],
                "logged": True
            }
            if habit_logs[user1_id]["completed"]:
                user1_completed += 1
        else:
            user_logs[user1_id] = {"completed": False, "logged": False}

        # User 2
        if user2_id in habit_logs:
            user_logs[user2_id] = {
                "completed": habit_logs[user2_id]["completed"],
                "logged": True
            }
            if habit_logs[user2_id]["completed"]:
                user2_completed += 1
        else:
            user_logs[user2_id] = {"completed": False, "logged": False}

        both_completed = (
                user_logs[user1_id]["completed"] and
                user_logs[user2_id]["completed"]
        )

        if both_completed:
            both_completed_count += 1

        habits_status.append(TodayLogStatus(
            habit_id=habit_id,
            habit_name=habit["habit_name"],
            user_logs=user_logs,
            both_completed=both_completed
        ))

    return PartnershipTodayStatus(
        partnership_id=partnership_id,
        date=today.date().isoformat(),
        habits=habits_status,
        completion_summary={
            "total_habits": len(habits),
            "both_completed_count": both_completed_count,
            "user1_completed": user1_completed,
            "user2_completed": user2_completed
        }
    )