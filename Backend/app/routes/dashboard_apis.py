from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.dashboard import (
    DashboardHomeResponse,
    StreakItemResponse,
    TodayGoalItemResponse,
    PartnerActivityItemResponse,
    PartnershipSummaryResponse,
    UserSummaryResponse
)
from app.utils.security import decode_access_token
from config.database import get_database
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
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


def calculate_hours_ago(timestamp: datetime) -> int:
    """Calculate hours ago from timestamp"""
    delta = datetime.utcnow() - timestamp
    return int(delta.total_seconds() / 3600)


@router.get("/home", response_model=DashboardHomeResponse)
async def get_dashboard_home(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get all homepage data in one consolidated response.
    
    Returns:
    - User greeting info
    - All habits with current streaks
    - Today's check-in status for each habit
    - Partner's recent activity (last 24-48 hours)
    - Partnership summary
    """
    # Get current user
    user_id = await get_current_user_id(credentials)
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Find active partnership
    partnership = await db.partnerships.find_one({
        "$or": [
            {"user_id_1": ObjectId(user_id)},
            {"user_id_2": ObjectId(user_id)}
        ],
        "status": "active"
    })
    
    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active partnership found"
        )
    
    # Determine partner ID
    partner_id = (
        str(partnership["user_id_2"]) 
        if str(partnership["user_id_1"]) == user_id 
        else str(partnership["user_id_1"])
    )
    
    partner = await db.users.find_one({"_id": ObjectId(partner_id)})
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partner not found"
        )
    
    # Get all active habits for this partnership
    habits = await db.habits.find({
        "partnership_id": str(partnership["_id"]),
        "status": "active"
    }).to_list(100)
    
    # Get today's logs
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    habit_ids = [str(h["_id"]) for h in habits]
    todays_logs = await db.habit_logs.find({
        "habit_id": {"$in": habit_ids},
        "log_date": today
    }).to_list(1000)
    
    # Create lookup for today's check-ins by habit and user
    checkins_map = {}
    for log in todays_logs:
        if log["habit_id"] not in checkins_map:
            checkins_map[log["habit_id"]] = {}
        checkins_map[log["habit_id"]][log["user_id"]] = log["completed"]
    
    # Build streaks list
    streaks = [
        StreakItemResponse(
            habit_id=str(habit["_id"]),
            habit_name=habit["habit_name"],
            current_streak=habit.get("current_streak", 0),
            category=habit["category"]
        )
        for habit in habits
    ]
    
    # Build today's goals with check-in status
    todays_goals = [
        TodayGoalItemResponse(
            habit_id=str(habit["_id"]),
            habit_name=habit["habit_name"],
            checked_in_today=checkins_map.get(str(habit["_id"]), {}).get(user_id, False),
            category=habit["category"]
        )
        for habit in habits
    ]
    
    # Query partner's recent activity (last 48 hours)
    hours_ago_48 = datetime.utcnow() - timedelta(hours=48)
    
    partner_logs = await db.habit_logs.find({
        "user_id": partner_id,
        "timestamp": {"$gte": hours_ago_48},
        "completed": True
    }).sort("timestamp", -1).limit(10).to_list(10)
    
    partner_progress: List[PartnerActivityItemResponse] = []
    
    if partner_logs:
        # Get habit names for partner's logs
        partner_habit_ids = list(set(log["habit_id"] for log in partner_logs))
        
        partner_habits = await db.habits.find({
            "_id": {"$in": [ObjectId(hid) for hid in partner_habit_ids]}
        }).to_list(100)
        
        habits_lookup = {
            str(habit["_id"]): habit["habit_name"] 
            for habit in partner_habits
        }
        
        partner_progress = [
            PartnerActivityItemResponse(
                partner_name=partner.get("display_name", partner["username"]),
                habit_name=habits_lookup.get(log["habit_id"], "Unknown Habit"),
                checked_in_at=log["timestamp"],
                hours_ago=calculate_hours_ago(log["timestamp"])
            )
            for log in partner_logs
        ]
    
    # Build response objects
    partnership_summary = PartnershipSummaryResponse(
        partner_name=partner.get("display_name", partner["username"]),
        partner_username=partner["username"],
        total_active_habits=len(habits)
    )
    
    user_summary = UserSummaryResponse(
        display_name=user.get("display_name", user["username"]),
        username=user["username"]
    )
    
    return DashboardHomeResponse(
        user=user_summary,
        streaks=streaks,
        todays_goals=todays_goals,
        partner_progress=partner_progress,
        partnership=partnership_summary
    )