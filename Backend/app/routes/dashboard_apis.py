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
from datetime import datetime
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
    - Partner's recent activity (placeholder for now)
    - Partnership summary
    """
    # 1. Get current user ID from token
    user_id = await get_current_user_id(credentials)
    
    # 2. Get user info for greeting
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 3. Find user's active partnership
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
    
    # 4. Get partner's info
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
    
    # 5. Get all active habits for this partnership
    habits = await db.habits.find({
        "partnership_id": str(partnership["_id"]),
        "status": "active"
    }).to_list(100)
    
    # 6. Get today's date (normalized to midnight UTC)
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 7. Get today's logs for all habits
    habit_ids = [str(h["_id"]) for h in habits]
    todays_logs = await db.habit_logs.find({
        "habit_id": {"$in": habit_ids},
        "date": today
    }).to_list(1000)
    
    # 8. Create lookup for today's check-ins by habit and user
    checkins_map = {}
    for log in todays_logs:
        if log["habit_id"] not in checkins_map:
            checkins_map[log["habit_id"]] = {}
        checkins_map[log["habit_id"]][log["user_id"]] = log["completed"]
    
    # 9. Build streaks list
    streaks = [
        StreakItemResponse(
            habit_id=str(habit["_id"]),
            habit_name=habit["habit_name"],
            current_streak=habit.get("current_streak", 0),
            category=habit["category"]
        )
        for habit in habits
    ]
    
    # 10. Build today's goals list (check-in status)
    todays_goals = [
        TodayGoalItemResponse(
            habit_id=str(habit["_id"]),
            habit_name=habit["habit_name"],
            checked_in_today=checkins_map.get(str(habit["_id"]), {}).get(user_id, False),
            category=habit["category"]
        )
        for habit in habits
    ]
    
    # 11. Partner activity - PLACEHOLDER
    # TODO: Implement partner activity query
    # Query partner's recent check-ins from last 24-48 hours
    # Filters needed:
    #   - user_id = partner_id (not current user)
    #   - logged_at >= (datetime.utcnow() - timedelta(days=2))
    #   - completed = True
    # Sort by logged_at DESC, limit to 5-10 results
    # Join with habits collection to get habit_name
    partner_progress: List[PartnerActivityItemResponse] = []
    
    # 12. Build partnership summary
    partnership_summary = PartnershipSummaryResponse(
        partner_name=partner.get("display_name", partner["username"]),
        partner_username=partner["username"],
        total_active_habits=len(habits)
    )
    
    # 13. Build user summary
    user_summary = UserSummaryResponse(
        display_name=user.get("display_name", user["username"]),
        username=user["username"]
    )
    
    # 14. Return complete dashboard response
    return DashboardHomeResponse(
        user=user_summary,
        streaks=streaks,
        todays_goals=todays_goals,
        partner_progress=partner_progress,
        partnership=partnership_summary
    )