from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.habit_log import (
    HabitLogCreate,
    HabitLogResponse,
    TodayLogStatus,
    PartnershipTodayStatus
)
from app.utils.security import decode_access_token
from config.database import get_database
from bson import ObjectId
from datetime import datetime, date, timedelta
from typing import List, Optional

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
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Log daily habit completion"""
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
    
    today = date.today()
    
    # Check if already logged today
    existing_log = await db.habit_logs.find_one({
        "habit_id": habit_id,
        "user_id": user_id,
        "date": today
    })
    
    if existing_log:
        # Update existing log
        await db.habit_logs.update_one(
            {"_id": existing_log["_id"]},
            {
                "$set": {
                    "completed": log_data.completed,
                    "notes": log_data.notes,
                    "logged_at": datetime.utcnow()
                }
            }
        )
        log_id = existing_log["_id"]
    else:
        # Create new log
        log_entry = {
            "habit_id": habit_id,
            "user_id": user_id,
            "completed": log_data.completed,
            "notes": log_data.notes,
            "date": today,
            "logged_at": datetime.utcnow()
        }
        
        result = await db.habit_logs.insert_one(log_entry)
        log_id = result.inserted_id
    
    # Check if both partners completed - update streak
    await update_partnership_streak(db, habit_id, habit["partnership_id"], today)
    
    # Get user info
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    # Get the log
    log = await db.habit_logs.find_one({"_id": log_id})
    
    return HabitLogResponse(
        id=str(log["_id"]),
        habit_id=log["habit_id"],
        user_id=log["user_id"],
        username=user["username"],
        completed=log["completed"],
        notes=log.get("notes"),
        date=log["date"].isoformat(),
        logged_at=log["logged_at"],
        current_streak=habit.get("current_streak", 0)
        
    )

async def update_partnership_streak(db, habit_id: str, partnership_id: str, check_date: date):
    """Update partnership streak if both partners completed"""
    
    # Get both partner IDs
    partnership = await db.partnerships.find_one({"_id": ObjectId(partnership_id)})
    user1_id = partnership["user_id_1"]
    user2_id = partnership["user_id_2"]
    
    # Check if both completed today
    logs_today = await db.habit_logs.find({
        "habit_id": habit_id,
        "date": check_date,
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
            "date": yesterday,
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
            {"_id": ObjectId(partnership_id)},
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
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get habit log history with optional filters"""
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
    
    # Build query
    query = {"habit_id": habit_id}
    
    if start_date:
        query["date"] = query.get("date", {})
        query["date"]["$gte"] = date.fromisoformat(start_date)
    
    if end_date:
        query["date"] = query.get("date", {})
        query["date"]["$lte"] = date.fromisoformat(end_date)
    
    if user_id_filter:
        query["user_id"] = user_id_filter
    
    # Get logs
    logs = await db.habit_logs.find(query).sort("date", -1).to_list(1000)
    
    # Get usernames
    user_ids = list(set(log["user_id"] for log in logs))
    users = await db.users.find({"_id": {"$in": [ObjectId(uid) for uid in user_ids]}}).to_list(100)
    user_map = {str(u["_id"]): u["username"] for u in users}
    
    return [
        HabitLogResponse(
            id=str(log["_id"]),
            habit_id=log["habit_id"],
            user_id=log["user_id"],
            username=user_map.get(log["user_id"], "Unknown"),
            completed=log["completed"],
            notes=log.get("notes"),
            date=log["date"].isoformat(),
            logged_at=log["logged_at"]
        )
        for log in logs
    ]

@router.get("/habits/{habit_id}/logs/today", response_model=TodayLogStatus)
async def get_today_log_status(
    habit_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get today's log status for both partners"""
    db = get_database()
    user_id = await get_current_user_id(credentials)
    
    # Verify habit exists and user has access
    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
    
    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )
    
    # Get partnership
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
    
    today = date.today()
    
    # Get today's logs for both users
    logs = await db.habit_logs.find({
        "habit_id": habit_id,
        "date": today
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
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all habits' completion status for today"""
    db = get_database()
    user_id = await get_current_user_id(credentials)
    
    # Verify partnership and access
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
            detail="Partnership not found"
        )
    
    user1_id = partnership["user_id_1"]
    user2_id = partnership["user_id_2"]
    
    # Get all active habits for this partnership
    habits = await db.habits.find({
        "partnership_id": partnership_id,
        "status": "active"
    }).to_list(100)
    
    today = date.today()
    
    # Get all today's logs for these habits
    habit_ids = [str(h["_id"]) for h in habits]
    logs = await db.habit_logs.find({
        "habit_id": {"$in": habit_ids},
        "date": today
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
        date=today.isoformat(),
        habits=habits_status,
        completion_summary={
            "total_habits": len(habits),
            "both_completed_count": both_completed_count,
            "user1_completed": user1_completed,
            "user2_completed": user2_completed
        }
    )