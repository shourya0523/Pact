from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.streak_history import (
    StreakHistoryCreate, 
    StreakHistoryUpdate, 
    StreakHistoryResponse,
    StreakHistoryLeaderboard
)
from app.utils.security import decode_access_token
from config.database import get_database
from bson import ObjectId
from datetime import datetime
from typing import List

# Create the router
router = APIRouter(prefix="/streak-history", tags=["Streak History"])
security = HTTPBearer()

@router.get("/habit/{habit_id}", response_model=List[StreakHistoryResponse])
async def get_habit_streak_history(
    habit_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get streak history for a specific habit"""
    # 1. Get the JWT token
    token = credentials.credentials
    
    # 2. Decode the token to get user info
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 3. Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 4. Connect to database
    db = get_database()
    
    # 5. Verify user has access to this habit
    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )
    
    # Check if user is part of the habit's partnership
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(habit["partnership_id"]),
        "$or": [
            {"user1_id": ObjectId(user_id)},
            {"user2_id": ObjectId(user_id)}
        ]
    })
    
    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this habit"
        )
    
    # 6. Get streak history for this habit
    streaks = await db.streak_history.find({
        "habit_id": habit_id
    }).sort("streak_start_date", -1).to_list(length=None)
    
    # 7. Convert to response format
    return [
        StreakHistoryResponse(
            id=str(streak["_id"]),
            partnership_id=streak["partnership_id"],
            habit_id=streak["habit_id"],
            streak_start_date=streak["streak_start_date"],
            streak_end_date=streak.get("streak_end_date"),
            streak_length_days=streak["streak_length_days"],
            ended_reason=streak.get("ended_reason"),
            created_at=streak["created_at"],
            updated_at=streak["updated_at"]
        )
        for streak in streaks
    ]

@router.get("/partnership/{partnership_id}", response_model=List[StreakHistoryResponse])
async def get_partnership_streak_history(
    partnership_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get streak history for a specific partnership"""
    # 1. Get the JWT token
    token = credentials.credentials
    
    # 2. Decode the token to get user info
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 3. Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 4. Connect to database
    db = get_database()
    
    # 5. Verify user has access to this partnership
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(partnership_id),
        "$or": [
            {"user1_id": ObjectId(user_id)},
            {"user2_id": ObjectId(user_id)}
        ]
    })
    
    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partnership not found or access denied"
        )
    
    # 6. Get streak history for this partnership
    streaks = await db.streak_history.find({
        "partnership_id": partnership_id
    }).sort("streak_start_date", -1).to_list(length=None)
    
    # 7. Convert to response format
    return [
        StreakHistoryResponse(
            id=str(streak["_id"]),
            partnership_id=streak["partnership_id"],
            habit_id=streak["habit_id"],
            streak_start_date=streak["streak_start_date"],
            streak_end_date=streak.get("streak_end_date"),
            streak_length_days=streak["streak_length_days"],
            ended_reason=streak.get("ended_reason"),
            created_at=streak["created_at"],
            updated_at=streak["updated_at"]
        )
        for streak in streaks
    ]

@router.post("/", response_model=StreakHistoryResponse)
async def create_streak_history(
    streak_data: StreakHistoryCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create new streak history record (system-generated)"""
    # 1. Get the JWT token
    token = credentials.credentials
    
    # 2. Decode the token to get user info
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 3. Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 4. Connect to database
    db = get_database()
    
    # 5. Verify user has access to this partnership and habit
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(streak_data.partnership_id),
        "$or": [
            {"user1_id": ObjectId(user_id)},
            {"user2_id": ObjectId(user_id)}
        ]
    })
    
    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this partnership"
        )
    
    habit = await db.habits.find_one({"_id": ObjectId(streak_data.habit_id)})
    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )
    
    # 6. Create the streak history record
    streak_doc = {
        "partnership_id": streak_data.partnership_id,
        "habit_id": streak_data.habit_id,
        "streak_start_date": streak_data.streak_start_date,
        "streak_end_date": streak_data.streak_end_date,
        "streak_length_days": streak_data.streak_length_days,
        "ended_reason": streak_data.ended_reason,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.streak_history.insert_one(streak_doc)
    
    # 7. Get the created record
    created_streak = await db.streak_history.find_one({"_id": result.inserted_id})
    
    return StreakHistoryResponse(
        id=str(created_streak["_id"]),
        partnership_id=created_streak["partnership_id"],
        habit_id=created_streak["habit_id"],
        streak_start_date=created_streak["streak_start_date"],
        streak_end_date=created_streak.get("streak_end_date"),
        streak_length_days=created_streak["streak_length_days"],
        ended_reason=created_streak.get("ended_reason"),
        created_at=created_streak["created_at"],
        updated_at=created_streak["updated_at"]
    )

@router.put("/{streak_id}", response_model=StreakHistoryResponse)
async def update_streak_history(
    streak_id: str,
    update_data: StreakHistoryUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update streak end date and reason when streak breaks"""
    # 1. Get the JWT token
    token = credentials.credentials
    
    # 2. Decode the token to get user info
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 3. Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 4. Connect to database
    db = get_database()
    
    # 5. Find the streak record
    streak = await db.streak_history.find_one({"_id": ObjectId(streak_id)})
    if not streak:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Streak record not found"
        )
    
    # 6. Verify user has access to this streak
    partnership = await db.partnerships.find_one({
        "_id": ObjectId(streak["partnership_id"]),
        "$or": [
            {"user1_id": ObjectId(user_id)},
            {"user2_id": ObjectId(user_id)}
        ]
    })
    
    if not partnership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this streak"
        )
    
    # 7. Prepare update data
    update_doc = {"updated_at": datetime.utcnow()}
    if update_data.streak_end_date is not None:
        update_doc["streak_end_date"] = update_data.streak_end_date
    if update_data.ended_reason is not None:
        update_doc["ended_reason"] = update_data.ended_reason
    
    # 8. Update the streak record
    await db.streak_history.update_one(
        {"_id": ObjectId(streak_id)},
        {"$set": update_doc}
    )
    
    # 9. Get the updated record
    updated_streak = await db.streak_history.find_one({"_id": ObjectId(streak_id)})
    
    return StreakHistoryResponse(
        id=str(updated_streak["_id"]),
        partnership_id=updated_streak["partnership_id"],
        habit_id=updated_streak["habit_id"],
        streak_start_date=updated_streak["streak_start_date"],
        streak_end_date=updated_streak.get("streak_end_date"),
        streak_length_days=updated_streak["streak_length_days"],
        ended_reason=updated_streak.get("ended_reason"),
        created_at=updated_streak["created_at"],
        updated_at=updated_streak["updated_at"]
    )

@router.get("/leaderboard", response_model=List[StreakHistoryLeaderboard])
async def get_streak_leaderboard(
    limit: int = 10,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get longest streaks across all users (leaderboard)"""
    # 1. Get the JWT token
    token = credentials.credentials
    
    # 2. Decode the token to get user info
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 3. Connect to database
    db = get_database()
    
    # 4. Get top streaks with user and habit information
    pipeline = [
        {
            "$lookup": {
                "from": "partnerships",
                "localField": "partnership_id",
                "foreignField": "_id",
                "as": "partnership"
            }
        },
        {
            "$lookup": {
                "from": "habits",
                "localField": "habit_id",
                "foreignField": "_id",
                "as": "habit"
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "partnership.user1_id",
                "foreignField": "_id",
                "as": "user1"
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "partnership.user2_id",
                "foreignField": "_id",
                "as": "user2"
            }
        },
        {
            "$addFields": {
                "user_id": {
                    "$cond": {
                        "if": {"$eq": ["$partnership.user1_id", ObjectId(payload.get("sub"))]},
                        "then": "$partnership.user1_id",
                        "else": "$partnership.user2_id"
                    }
                },
                "partner_id": {
                    "$cond": {
                        "if": {"$eq": ["$partnership.user1_id", ObjectId(payload.get("sub"))]},
                        "then": "$partnership.user2_id",
                        "else": "$partnership.user1_id"
                    }
                }
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "partner_id",
                "foreignField": "_id",
                "as": "partner"
            }
        },
        {
            "$addFields": {
                "habit_name": {"$arrayElemAt": ["$habit.name", 0]},
                "partner_name": {"$arrayElemAt": ["$partner.display_name", 0]}
            }
        },
        {
            "$sort": {"streak_length_days": -1}
        },
        {
            "$limit": limit
        }
    ]
    
    streaks = await db.streak_history.aggregate(pipeline).to_list(length=limit)
    
    # 5. Convert to response format
    return [
        StreakHistoryLeaderboard(
            id=str(streak["_id"]),
            partnership_id=streak["partnership_id"],
            habit_id=streak["habit_id"],
            streak_length_days=streak["streak_length_days"],
            streak_start_date=streak["streak_start_date"],
            streak_end_date=streak.get("streak_end_date"),
            user_id=str(streak["user_id"]),
            habit_name=streak["habit_name"],
            partner_name=streak["partner_name"]
        )
        for streak in streaks
    ]
