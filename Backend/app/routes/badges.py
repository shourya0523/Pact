from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.badges import (
    BadgeResponse, 
    BadgeCreate,
    BadgeUpdate,
    UserBadgeResponse, 
    UserBadgeCreate,
    UserBadgeUpdate,
    UserBadgeWithUserInfo
)
from app.utils.security import decode_access_token
from config.database import get_database
from bson import ObjectId
from datetime import datetime
from typing import List, Optional

router = APIRouter(tags=["Badges"])
security = HTTPBearer()

async def get_db():
    from config.database import get_database
    db = get_database()
    return db


@router.post("/badges", response_model=BadgeResponse, status_code=status.HTTP_201_CREATED)
async def create_badge(
    badge: BadgeCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
):
    """Create a new badge (admin/system use)"""
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    badge_dict = badge.model_dump()
    badge_dict["created_at"] = datetime.utcnow()
    badge_dict["updated_at"] = badge_dict["created_at"]
    
    result = await db.badges.insert_one(badge_dict)
    
    created_badge = await db.badges.find_one({"_id": result.inserted_id})
    return BadgeResponse(
        id=str(created_badge["_id"]),
        name=created_badge["name"],
        description=created_badge["description"],
        category=created_badge["category"],
        level=created_badge.get("level", "bronze"),
        icon_url=created_badge.get("icon_url"),
        criteria=created_badge.get("criteria"),
        created_at=created_badge["created_at"],
        updated_at=created_badge["updated_at"]
    )

@router.get("/badges", response_model=List[BadgeResponse])
async def get_badges(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
):
    """Get all available badges"""
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    badges = await db.badges.find().to_list(None)
    return [
        BadgeResponse(
            id=str(badge["_id"]),
            name=badge["name"],
            description=badge["description"],
            category=badge["category"],
            level=badge.get("level", "bronze"),
            icon_url=badge.get("icon_url"),
            criteria=badge.get("criteria"),
            created_at=badge.get("created_at"),
            updated_at=badge.get("updated_at")
        ) 
        for badge in badges
    ]

@router.get("/badges/{badge_id}", response_model=BadgeResponse)
async def get_badge(
    badge_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
):
    """Get a specific badge by ID"""
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    try:
        badge = await db.badges.find_one({"_id": ObjectId(badge_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid badge ID format"
        )
        
    if not badge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Badge not found"
        )
    return BadgeResponse(
        id=str(badge["_id"]),
        name=badge["name"],
        description=badge["description"],
        category=badge["category"],
        level=badge.get("level", "bronze"),
        icon_url=badge.get("icon_url"),
        criteria=badge.get("criteria"),
        created_at=badge.get("created_at"),
        updated_at=badge.get("updated_at")
    )

# ============================================================================
# KAN-80: GET/Retrieve user badges
# ============================================================================

@router.get("/badges/users/{user_id}", response_model=List[UserBadgeResponse])
async def get_user_badges(
    user_id: str,
    shown_only: bool = Query(False, description="Filter by shown status"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
):
    """
    KAN-80: Get all badges earned by a specific user
    
    Authorization:
    - Users can view their own badges
    - Partners can view each other's badges (if active partnership exists)
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    current_user_id = payload.get("sub")
    if not current_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # Verify user can access these badges (either own badges or partnership)
    if user_id != current_user_id:
        # Check if users are in a partnership
        partnership = await db.partnerships.find_one({
            "$or": [
                {"user_id_1": current_user_id, "user_id_2": user_id},
                {"user_id_1": user_id, "user_id_2": current_user_id}
            ],
            "status": "active"
        })
        
        if not partnership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to user badges"
            )
    
    # Build query
    query = {"user_id": user_id}
    if shown_only:
        query["shown"] = True
    
    # Get user badges with badge details
    pipeline = [
        {"$match": query},
        {
            "$addFields": {
                "badge_id_obj": {"$toObjectId": "$badge_id"}
            }
        },
        {
            "$lookup": {
                "from": "badges",
                "localField": "badge_id_obj",
                "foreignField": "_id",
                "as": "badge"
            }
        },
        {"$unwind": "$badge"},
        {"$sort": {"assigned_date": -1}}
    ]
    
    user_badges = await db.user_badges.aggregate(pipeline).to_list(length=None)
    
    return [
        UserBadgeResponse(
            id=str(badge["_id"]),
            user_id=badge["user_id"],
            badge_id=badge["badge_id"],
            assigned_date=badge["assigned_date"],
            shown=badge.get("shown", False),
            badge=BadgeResponse(
                id=str(badge["badge"]["_id"]),
                name=badge["badge"]["name"],
                description=badge["badge"]["description"],
                category=badge["badge"]["category"],
                level=badge["badge"].get("level", "bronze"),
                icon_url=badge["badge"].get("icon_url"),
                criteria=badge["badge"].get("criteria"),
                created_at=badge["badge"].get("created_at"),
                updated_at=badge["badge"].get("updated_at")
            )
        )
        for badge in user_badges
    ]

# ============================================================================
# KAN-81: POST/Assign badge to a user
# ============================================================================

@router.post("/badges/users/{user_id}/assign", response_model=UserBadgeResponse)
async def assign_badge_to_user(
    user_id: str,
    badge_data: UserBadgeCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
):
    """
    KAN-81: Assign a badge to a user
    
    No notification logic included - that's handled by the Notification API.
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # Verify badge exists
    try:
        badge = await db.badges.find_one({"_id": ObjectId(badge_data.badge_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid badge ID format"
        )
        
    if not badge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Badge not found"
        )
    
    # Verify user exists
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )
        
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user already has this badge
    existing_badge = await db.user_badges.find_one({
        "user_id": user_id,
        "badge_id": badge_data.badge_id
    })
    
    if existing_badge:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has this badge"
        )
    
    # Create the user badge record
    user_badge_doc = {
        "user_id": user_id,
        "badge_id": badge_data.badge_id,
        "assigned_date": datetime.utcnow(),
        "shown": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.user_badges.insert_one(user_badge_doc)
    
    # Get the created record with badge details
    pipeline = [
        {"$match": {"_id": result.inserted_id}},
        {
            "$addFields": {
                "badge_id_obj": {"$toObjectId": "$badge_id"}
            }
        },
        {
            "$lookup": {
                "from": "badges",
                "localField": "badge_id_obj",
                "foreignField": "_id",
                "as": "badge"
            }
        },
        {"$unwind": "$badge"}
    ]
    
    created_badges = await db.user_badges.aggregate(pipeline).to_list(length=1)
    created_badge = created_badges[0] if created_badges else None
    
    if not created_badge:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create badge assignment"
        )
    
    return UserBadgeResponse(
        id=str(created_badge["_id"]),
        user_id=created_badge["user_id"],
        badge_id=created_badge["badge_id"],
        assigned_date=created_badge["assigned_date"],
        shown=created_badge.get("shown", False),
        badge=BadgeResponse(
            id=str(created_badge["badge"]["_id"]),
            name=created_badge["badge"]["name"],
            description=created_badge["badge"]["description"],
            category=created_badge["badge"]["category"],
            level=created_badge["badge"].get("level", "bronze"),
            icon_url=created_badge["badge"].get("icon_url"),
            criteria=created_badge["badge"].get("criteria"),
            created_at=created_badge["badge"].get("created_at"),
            updated_at=created_badge["badge"].get("updated_at")
        )
    )

# ============================================================================
# KAN-82: GET/Retrieve users who have earned specific badges
# ============================================================================

@router.get("/badges/{badge_id}/users", response_model=List[UserBadgeWithUserInfo])
async def get_users_with_badge(
    badge_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
):
    """
    KAN-82: Get all users who have earned a specific badge
    
    Returns user information along with badge assignment details.
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # Verify badge exists
    try:
        badge = await db.badges.find_one({"_id": ObjectId(badge_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid badge ID format"
        )
        
    if not badge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Badge not found"
        )
    
    # Get users with this badge including user info
    pipeline = [
        {"$match": {"badge_id": badge_id}},
        {
            "$addFields": {
                "user_id_obj": {"$toObjectId": "$user_id"}
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id_obj",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {"$unwind": "$user"},
        {"$sort": {"assigned_date": -1}}
    ]
    
    user_badges = await db.user_badges.aggregate(pipeline).to_list(length=None)
    
    return [
        UserBadgeWithUserInfo(
            user_badge_id=str(badge["_id"]),
            user_id=badge["user_id"],
            badge_id=badge["badge_id"],
            assigned_date=badge["assigned_date"],
            shown=badge.get("shown", False),
            user_name=badge["user"].get("display_name", ""),
            user_username=badge["user"].get("username", ""),
            profile_picture=badge["user"].get("profile_picture")
        )
        for badge in user_badges
    ]

# ============================================================================
# KAN-83: GET/Retrieve recently assigned badges
# ============================================================================

@router.get("/badges/recent/assignments", response_model=List[UserBadgeResponse])
async def get_recent_badges(
    limit: int = Query(10, le=50, description="Maximum number of results"),
    hours: int = Query(24, description="Within last X hours"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
):
    """
    KAN-83: Get recently assigned badges across all users
    
    Useful for showing a feed of recent badge achievements in the app.
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # Calculate time threshold
    from datetime import timedelta
    time_threshold = datetime.utcnow() - timedelta(hours=hours)
    
    # Get recent badges with badge details
    pipeline = [
        {
            "$match": {
                "assigned_date": {"$gte": time_threshold}
            }
        },
        {
            "$addFields": {
                "badge_id_obj": {"$toObjectId": "$badge_id"}
            }
        },
        {
            "$lookup": {
                "from": "badges",
                "localField": "badge_id_obj",
                "foreignField": "_id",
                "as": "badge"
            }
        },
        {"$unwind": "$badge"},
        {"$sort": {"assigned_date": -1}},
        {"$limit": limit}
    ]
    
    recent_badges = await db.user_badges.aggregate(pipeline).to_list(length=limit)
    
    return [
        UserBadgeResponse(
            id=str(badge["_id"]),
            user_id=badge["user_id"],
            badge_id=badge["badge_id"],
            assigned_date=badge["assigned_date"],
            shown=badge.get("shown", False),
            badge=BadgeResponse(
                id=str(badge["badge"]["_id"]),
                name=badge["badge"]["name"],
                description=badge["badge"]["description"],
                category=badge["badge"]["category"],
                level=badge["badge"].get("level", "bronze"),
                icon_url=badge["badge"].get("icon_url"),
                criteria=badge["badge"].get("criteria"),
                created_at=badge["badge"].get("created_at"),
                updated_at=badge["badge"].get("updated_at")
            )
        )
        for badge in recent_badges
    ]

# ============================================================================
# ADDITIONAL HELPER ENDPOINT: Mark badge as shown (for UI purposes)
# ============================================================================

@router.patch("/badges/user-badges/{user_badge_id}", response_model=UserBadgeResponse)
async def mark_badge_shown(
    user_badge_id: str,
    update_data: UserBadgeUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
):
    """
    Mark a badge as shown/acknowledged by the user
    
    This allows users to dismiss badge popups in the UI. Only users can
    update their own badges' shown status.
    """
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # Find and update the user badge
    try:
        result = await db.user_badges.update_one(
            {
                "_id": ObjectId(user_badge_id),
                "user_id": user_id  # Ensure user can only update their own badges
            },
            {
                "$set": {
                    "shown": update_data.shown,
                    "updated_at": datetime.utcnow()
                }
            }
        )
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user badge ID format"
        )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User badge not found or access denied"
        )
    
    # Get the updated record
    pipeline = [
        {"$match": {"_id": ObjectId(user_badge_id)}},
        {
            "$addFields": {
                "badge_id_obj": {"$toObjectId": "$badge_id"}
            }
        },
        {
            "$lookup": {
                "from": "badges",
                "localField": "badge_id_obj",
                "foreignField": "_id",
                "as": "badge"
            }
        },
        {"$unwind": "$badge"}
    ]
    
    updated_badges = await db.user_badges.aggregate(pipeline).to_list(length=1)
    updated_badge = updated_badges[0] if updated_badges else None
    
    if not updated_badge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Failed to retrieve updated badge"
        )
    
    return UserBadgeResponse(
        id=str(updated_badge["_id"]),
        user_id=updated_badge["user_id"],
        badge_id=updated_badge["badge_id"],
        assigned_date=updated_badge["assigned_date"],
        shown=updated_badge.get("shown", False),
        badge=BadgeResponse(
            id=str(updated_badge["badge"]["_id"]),
            name=updated_badge["badge"]["name"],
            description=updated_badge["badge"]["description"],
            category=updated_badge["badge"]["category"],
            level=updated_badge["badge"].get("level", "bronze"),
            icon_url=updated_badge["badge"].get("icon_url"),
            criteria=updated_badge["badge"].get("criteria"),
            created_at=updated_badge["badge"].get("created_at"),
            updated_at=updated_badge["badge"].get("updated_at")
        )
    )