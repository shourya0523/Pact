from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from datetime import datetime, timedelta
from bson import ObjectId
from config.database import get_database
from app.utils.security import decode_access_token
from app.models.notification import (
    Notification,
    NotificationCreate,
    NotificationResponse,
    NotificationType
)

router = APIRouter(prefix="/notifications", tags=["notifications"])
security = HTTPBearer()


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extract user ID from JWT token"""
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    return payload.get("sub")


def calculate_time_ago(created_at: datetime) -> str:
    """Calculate human-readable time ago string"""
    now = datetime.utcnow()
    diff = now - created_at
    
    if diff.days > 365:
        years = diff.days // 365
        return f"{years} year{'s' if years > 1 else ''} ago"
    elif diff.days > 30:
        months = diff.days // 30
        return f"{months} month{'s' if months > 1 else ''} ago"
    elif diff.days > 0:
        return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
    elif diff.seconds >= 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    elif diff.seconds >= 60:
        minutes = diff.seconds // 60
        return f"About {minutes} minute{'s' if minutes > 1 else ''} ago"
    else:
        return "Just now"


@router.get("/test-fetch")
async def test_fetch_notifications(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database)
):
    """TEST endpoint - fetch notifications with detailed logging"""
    print("\n" + "="*60)
    print("TEST NOTIFICATIONS ENDPOINT CALLED")
    print("="*60)
    
    token = credentials.credentials
    print(f"Token received: {token[:30]}...")
    
    payload = decode_access_token(token)
    print(f"Token payload: {payload}")
    
    if not payload:
        print("ERROR: Token decode failed!")
        return {"error": "Invalid token"}
    
    user_id = payload.get("sub")
    print(f"User ID: {user_id}")
    
    # Find notifications
    notifs = await db.notifications.find({"user_id": user_id}).to_list(100)
    print(f"Found {len(notifs)} notifications")
    
    for n in notifs:
        print(f"  - {n.get('title')}")
    
    return {"count": len(notifs), "notifications": [str(n) for n in notifs]}


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database)
):
    """Get all notifications for the current user"""
    try:
        user_id = await get_current_user_id(credentials)
        print(f"📬 FETCHING NOTIFICATIONS for user ID: {user_id}")
        notifications_cursor = db.notifications.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(50)
        
        notifications = []
        async for notif_doc in notifications_cursor:
            print(f"  ✉️  Found notification: {notif_doc.get('title')[:50]}...")
            notif_data = {
                "id": str(notif_doc["_id"]),
                "type": notif_doc["type"],
                "title": notif_doc["title"],
                "message": notif_doc.get("message"),
                "time_ago": calculate_time_ago(notif_doc["created_at"]),
                "is_read": notif_doc.get("is_read", False),
                "action_taken": notif_doc.get("action_taken", False),
                "related_id": notif_doc.get("related_id"),
                "related_user_id": notif_doc.get("related_user_id"),
                "created_at": notif_doc["created_at"]
            }
            
            # If there's a related user, get their info
            if notif_doc.get("related_user_id"):
                partner = await db.users.find_one({"_id": ObjectId(notif_doc["related_user_id"])})
                if partner:
                    notif_data["partner_username"] = partner.get("username")
                    notif_data["partner_avatar"] = partner.get("profile_photo_url") or partner.get("profile_picture")
            
            # If there's a related habit, get habit name
            if notif_doc.get("related_id") and notif_doc["type"] in [
                NotificationType.HABIT_REMINDER,
                NotificationType.MISSED_HABIT,
                NotificationType.PROGRESS_MILESTONE
            ]:
                habit = await db.habits.find_one({"_id": ObjectId(notif_doc["related_id"])})
                if habit:
                    notif_data["habit_name"] = habit.get("name")
            
            notifications.append(NotificationResponse(**notif_data))
        
        return notifications
        
    except Exception as e:
        print(f"Error fetching notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch notifications: {str(e)}"
        )


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification: NotificationCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database)
):
    """Create a new notification"""
    try:
        notif_dict = notification.model_dump()
        notif_dict["created_at"] = datetime.utcnow()
        notif_dict["is_read"] = False
        notif_dict["action_taken"] = False
        
        result = await db.notifications.insert_one(notif_dict)
        
        return {"id": str(result.inserted_id), "message": "Notification created"}
        
    except Exception as e:
        print(f"Error creating notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create notification: {str(e)}"
        )


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database)
):
    """Mark a notification as read and delete it"""
    try:
        user_id = await get_current_user_id(credentials)
        
        result = await db.notifications.delete_one(
            {
                "_id": ObjectId(notification_id),
                "user_id": user_id
            }
        )
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"message": "Notification deleted"}
        
    except Exception as e:
        print(f"Error deleting notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/{notification_id}/action")
async def mark_notification_action_taken(
    notification_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database)
):
    """Mark a notification as action taken"""
    try:
        user_id = await get_current_user_id(credentials)
        
        result = await db.notifications.update_one(
            {
                "_id": ObjectId(notification_id),
                "user_id": user_id
            },
            {"$set": {"action_taken": True}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"message": "Notification action marked"}
        
    except Exception as e:
        print(f"Error marking notification action: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database)
):
    """Delete a notification"""
    try:
        user_id = await get_current_user_id(credentials)
        
        result = await db.notifications.delete_one(
            {
                "_id": ObjectId(notification_id),
                "user_id": user_id
            }
        )
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"message": "Notification deleted"}
        
    except Exception as e:
        print(f"Error deleting notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/nudge/{partner_id}")
async def send_partner_nudge(
    partner_id: str,
    habit_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database)
):
    """Send a nudge notification to a partner"""
    try:
        user_id = await get_current_user_id(credentials)
        
        # Get username
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        username = user.get("username", "Your partner") if user else "Your partner"
        
        # Get habit name
        habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
        habit_name = habit.get("name", "their habit") if habit else "their habit"
        
        # Create notification for partner
        notification = {
            "user_id": partner_id,
            "type": NotificationType.PARTNER_NUDGE,
            "title": f"{username} is nudging you to work on {habit_name}!",
            "message": f"Your partner thinks it's time to {habit_name}",
            "related_id": habit_id,
            "related_user_id": user_id,
            "created_at": datetime.utcnow(),
            "is_read": False,
            "action_taken": False
        }
        
        result = await db.notifications.insert_one(notification)
        
        return {
            "message": "Nudge sent successfully",
            "notification_id": str(result.inserted_id)
        }
        
    except Exception as e:
        print(f"Error sending nudge: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/unread/count")
async def get_unread_count(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database)
):
    """Get count of unread notifications"""
    try:
        user_id = await get_current_user_id(credentials)
        
        count = await db.notifications.count_documents({
            "user_id": user_id,
            "is_read": False
        })
        
        return {"unread_count": count}
        
    except Exception as e:
        print(f"Error getting unread count: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
