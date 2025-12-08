from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.dashboard import (
    DashboardHomeResponse,
    StreakItemResponse,
    TodayGoalItemResponse,
    PartnerActivityItemResponse,
    PartnershipSummaryResponse,
    UserSummaryResponse,
    ActivitySummaryResponse
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
        habit_id_str = str(log["habit_id"])
        user_id_obj = log["user_id"]  # This is already ObjectId from DB
        if habit_id_str not in checkins_map:
            checkins_map[habit_id_str] = {}
        checkins_map[habit_id_str][user_id_obj] = log["completed"]
    
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
    # Convert user_id to ObjectId for map lookup since map keys are ObjectIds
    user_id_obj = ObjectId(user_id)
    todays_goals = [
        TodayGoalItemResponse(
            habit_id=str(habit["_id"]),
            habit_name=habit["habit_name"],
            checked_in_today=checkins_map.get(str(habit["_id"]), {}).get(user_id_obj, False),
            category=habit["category"]
        )
        for habit in habits
    ]
    
    # Query partner's recent activity (last 48 hours)
    hours_ago_48 = datetime.utcnow() - timedelta(hours=48)
    
    # Convert partner_id to ObjectId for proper matching (habit_logs stores user_id as ObjectId)
    partner_logs = await db.habit_logs.find({
        "user_id": ObjectId(partner_id),
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
                partner_name=partner.get("display_name") or partner.get("username", ""),
                habit_name=habits_lookup.get(log["habit_id"], "Unknown Habit"),
                checked_in_at=log["timestamp"],
                hours_ago=calculate_hours_ago(log["timestamp"])
            )
            for log in partner_logs
        ]
    
    # Build response objects
    partnership_summary = PartnershipSummaryResponse(
        partner_name=partner.get("display_name") or partner.get("username", ""),
        partner_username=partner["username"],
        total_active_habits=len(habits)
    )
    
    user_summary = UserSummaryResponse(
        display_name=user.get("display_name") or user.get("username", ""),
        username=user["username"]
    )
    
    # Calculate activity summary statistics
    # Count total partners (active partnerships)
    total_partners = await db.partnerships.count_documents({
        "$or": [
            {"user_id_1": ObjectId(user_id)},
            {"user_id_2": ObjectId(user_id)}
        ],
        "status": "active"
    })
    
    # Count total active habits for this user across all partnerships
    all_user_partnerships = await db.partnerships.find({
        "$or": [
            {"user_id_1": ObjectId(user_id)},
            {"user_id_2": ObjectId(user_id)}
        ],
        "status": "active"
    }).to_list(100)
    
    partnership_ids = [str(p["_id"]) for p in all_user_partnerships]
    
    # Count total active habits for this user across all partnerships
    if partnership_ids:
        total_habits = await db.habits.count_documents({
            "partnership_id": {"$in": partnership_ids},
            "status": "active"
        })
    else:
        total_habits = 0
    
    # Count total goals for this user
    # Get all habits where user has goals
    if partnership_ids:
        habits_with_goals = await db.habits.find({
            f"goals.{user_id}": {"$exists": True},
            "partnership_id": {"$in": partnership_ids}
        }).to_list(1000)
    else:
        habits_with_goals = []
    
    total_goals = 0
    for habit in habits_with_goals:
        user_goals = habit.get("goals", {}).get(user_id, {})
        if user_goals:
            # Count active goals only
            goal_status = user_goals.get("goal_status", "active")
            if goal_status == "active":
                total_goals += 1
    
    # Count total check-ins for this user
    # Convert user_id to ObjectId for proper matching (habit_logs stores user_id as ObjectId)
    total_checkins = await db.habit_logs.count_documents({
        "user_id": ObjectId(user_id),
        "completed": True
    })
    
    activity_summary = ActivitySummaryResponse(
        total_partners=total_partners,
        total_habits=total_habits,
        total_goals=total_goals,
        total_checkins=total_checkins
    )
    
    return DashboardHomeResponse(
        user=user_summary,
        streaks=streaks,
        todays_goals=todays_goals,
        partner_progress=partner_progress,
        partnership=partnership_summary,
        activity_summary=activity_summary
    )