from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from config.database import get_database
from app.utils.security import decode_access_token
from app.models.notification import (
    Notification,
    NotificationCreate,
    NotificationResponse,
    NotificationType
)
from app.services.notification_service import notification_service
import os

# Demo mode - disable verbose logging for faster performance
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

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
    if not DEMO_MODE:
        print("\n" + "="*60)
        print("TEST NOTIFICATIONS ENDPOINT CALLED")
        print("="*60)
    
    token = credentials.credentials
    if not DEMO_MODE:
        print(f"Token received: {token[:30]}...")
    
    payload = decode_access_token(token)
    if not DEMO_MODE:
        print(f"Token payload: {payload}")
    
    if not payload:
        if not DEMO_MODE:
            print("ERROR: Token decode failed!")
        return {"error": "Invalid token"}
    
    user_id = payload.get("sub")
    if not DEMO_MODE:
        print(f"User ID: {user_id}")
    
    # Find notifications
    notifs = await db.notifications.find({"user_id": user_id}).to_list(100)
    if not DEMO_MODE:
        print(f"Found {len(notifs)} notifications")
        for n in notifs:
            print(f"  - {n.get('title')}")
    
    return {"count": len(notifs), "notifications": [str(n) for n in notifs]}


@router.post("/test-push")
async def test_push_notification(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database)
):
    """TEST endpoint - send a test push notification to the current user"""
    try:
        user_id = await get_current_user_id(credentials)
        
        # Send a test notification using the notification service
        await notification_service.send_notification(
            user_id=user_id,
            notification_type=NotificationType.HABIT_REMINDER,
            title="🧪 Test Push Notification",
            message="This is a test notification! If you're seeing this, push notifications are working! 🎉",
            skip_preference_check=True  # Skip preferences for test notifications
        )
        
        return {
            "message": "Test notification sent successfully",
            "success": True
        }
        
    except Exception as e:
        if not DEMO_MODE:
            print(f"Error sending test notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test notification: {str(e)}"
        )


@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database),
    include_read: bool = Query(False, description="Include read notifications")
):
    """Get all notifications for the current user"""
    try:
        user_id = await get_current_user_id(credentials)
        if not DEMO_MODE:
            print(f"📬 FETCHING NOTIFICATIONS for user ID: {user_id}")
        
        # Build query
        query = {
            "user_id": ObjectId(user_id)
        }
        
        # If include_read is False, show only unread and not archived
        # If include_read is True, show only archived notifications
        if not include_read:
            query["is_read"] = False
            query["archived"] = {"$ne": True}
        else:
            # When include_read is True (showArchived=true), filter for archived notifications only
            query["archived"] = True
        
        notifications_cursor = db.notifications.find(query).sort("created_at", -1).limit(50)
        
        notifications = []
        async for notif_doc in notifications_cursor:
            try:
                title = notif_doc.get('title', 'Notification')
                if not DEMO_MODE:
                    print(f"  ✉️  Found notification: {title[:50] if title else 'Untitled'}...")
                
                # Ensure created_at exists and is a datetime
                created_at = notif_doc.get("created_at")
                if not created_at:
                    created_at = datetime.utcnow()
                elif isinstance(created_at, str):
                    # Try to parse if it's a string
                    try:
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    except:
                        created_at = datetime.utcnow()
                
                # Helper to safely convert to string
                def safe_str(value):
                    if value is None:
                        return None
                    if isinstance(value, ObjectId):
                        return str(value)
                    return str(value) if value else None
                
                notif_data = {
                    "id": str(notif_doc["_id"]),
                    "type": notif_doc.get("type", "unknown"),
                    "title": title,
                    "message": notif_doc.get("message"),
                    "time_ago": calculate_time_ago(created_at),
                    "is_read": notif_doc.get("is_read", False),
                    "action_taken": notif_doc.get("action_taken", False),
                    "related_id": safe_str(notif_doc.get("related_id")),
                    "related_user_id": safe_str(notif_doc.get("related_user_id")),
                    "created_at": created_at
                }
                
                # If there's a related user, get their info
                if notif_doc.get("related_user_id"):
                    try:
                        partner = await db.users.find_one({"_id": ObjectId(notif_doc["related_user_id"])})
                        if partner:
                            notif_data["partner_username"] = partner.get("username")
                            notif_data["partner_avatar"] = partner.get("profile_photo_url") or partner.get("profile_picture")
                    except Exception as e:
                        if not DEMO_MODE:
                            print(f"⚠️ Error fetching partner for notification: {e}")
                        # Continue without partner info if ObjectId conversion fails
                
                # If there's a related habit, get habit name
                if notif_doc.get("related_id") and notif_doc.get("type") in [
                    NotificationType.HABIT_REMINDER,
                    NotificationType.MISSED_HABIT,
                    NotificationType.PROGRESS_MILESTONE
                ]:
                    try:
                        habit = await db.habits.find_one({"_id": ObjectId(notif_doc["related_id"])})
                        if habit:
                            notif_data["habit_name"] = habit.get("habit_name")
                    except Exception as e:
                        if not DEMO_MODE:
                            print(f"⚠️ Error fetching habit for notification: {e}")
                        # Continue without habit name if ObjectId conversion fails
                
                notifications.append(NotificationResponse(**notif_data))
            except Exception as e:
                if not DEMO_MODE:
                    print(f"⚠️ Error processing notification {notif_doc.get('_id')}: {e}")
                # Skip this notification and continue with the next one
                continue
        
        return notifications
        
    except Exception as e:
        if not DEMO_MODE:
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
        if not DEMO_MODE:
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
    """Mark a notification as read (archives it instead of deleting)"""
    try:
        user_id = await get_current_user_id(credentials)
        
        result = await db.notifications.update_one(
            {
                "_id": ObjectId(notification_id),
                "user_id": ObjectId(user_id)
            },
            {
                "$set": {
                    "is_read": True,
                    "archived": True,
                    "read_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"message": "Notification marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        if not DEMO_MODE:
            print(f"Error marking notification as read: {str(e)}")
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
                "user_id": ObjectId(user_id)
            },
            {"$set": {"action_taken": True}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"message": "Notification action marked"}
        
    except HTTPException:
        raise
    except Exception as e:
        if not DEMO_MODE:
            print(f"Error marking notification action: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/archive-all")
async def archive_all_notifications(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database)
):
    """Archive all unread notifications for the current user"""
    try:
        user_id = await get_current_user_id(credentials)
        
        result = await db.notifications.update_many(
            {
                "user_id": ObjectId(user_id),
                "archived": {"$ne": True}
            },
            {
                "$set": {
                    "archived": True
                }
            }
        )
        
        return {
            "message": f"Archived {result.modified_count} notifications",
            "archived_count": result.modified_count
        }
        
    except Exception as e:
        if not DEMO_MODE:
            print(f"Error archiving all notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/{notification_id}/archive")
async def archive_notification(
    notification_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database)
):
    """Archive a notification (without marking as read)"""
    try:
        user_id = await get_current_user_id(credentials)
        
        result = await db.notifications.update_one(
            {
                "_id": ObjectId(notification_id),
                "user_id": ObjectId(user_id)
            },
            {
                "$set": {
                    "archived": True
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"message": "Notification archived"}
        
    except HTTPException:
        raise
    except Exception as e:
        if not DEMO_MODE:
            print(f"Error archiving notification: {str(e)}")
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
                "user_id": ObjectId(user_id)
            }
        )
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"message": "Notification deleted"}
        
    except Exception as e:
        if not DEMO_MODE:
            print(f"Error deleting notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/nudge/{partner_id}")
async def send_partner_nudge(
    partner_id: str,
    habit_id: str = Query(..., description="Habit ID to nudge about"),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_database)
):
    """Send a nudge notification to a partner (rate limited to once per day per habit)"""
    try:
        user_id = await get_current_user_id(credentials)
        
        # Verify partnership exists
        habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
        if not habit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Habit not found"
            )
        
        partnership_id = habit.get("partnership_id")
        if not partnership_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This habit is not part of a partnership"
            )
        
        # Verify users are partners
        partnership = await db.partnerships.find_one({"_id": ObjectId(partnership_id)})
        if not partnership:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Partnership not found"
            )
        
        user1_id = str(partnership["user_id_1"])
        user2_id = str(partnership["user_id_2"])
        
        if user_id not in [user1_id, user2_id] or partner_id not in [user1_id, user2_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only nudge your partner"
            )
        
        # Rate limiting: Check if user has already sent a nudge today for this habit/partner
        # Use UTC midnight for consistent day boundaries
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        # Check for existing nudge - related_id and related_user_id are stored as strings
        existing_nudge = await db.notifications.find_one({
            "type": NotificationType.PARTNER_NUDGE,
            "related_id": str(habit_id),  # Ensure string format
            "related_user_id": str(user_id),  # Sender (stored as string)
            "user_id": ObjectId(partner_id),  # Recipient (stored as ObjectId)
            "created_at": {"$gte": today_start}
        })
        
        if existing_nudge:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="You can only send one nudge per day for this habit. Try again tomorrow!"
            )
        
        # Get sender username
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        username = user.get("username", "Your partner") if user else "Your partner"
        
        # Get habit name
        habit_name = habit.get("habit_name", "their habit") if habit else "their habit"
        
        # Send notification using service
        await notification_service.send_partner_nudge_notification(
            recipient_user_id=partner_id,
            sender_user_id=user_id,
            sender_username=username,
            habit_id=habit_id,
            habit_name=habit_name
        )
        
        return {
            "message": "Nudge sent successfully",
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if not DEMO_MODE:
            print(f"Error sending nudge: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send nudge: {str(e)}"
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
            "user_id": ObjectId(user_id),
            "is_read": False,
            "archived": {"$ne": True}
        })
        
        return {"unread_count": count}
        
    except Exception as e:
        if not DEMO_MODE:
            print(f"Error getting unread count: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/send-checkin-reminders")
async def send_checkin_reminders(
    db=Depends(get_database),
    secret_key: str = Query(..., description="Secret key to authorize this endpoint")
):
    """
    Send checkin reminder notifications for all active habits.
    
    This endpoint should be called by a cron job (e.g., daily at 9 AM).
    It sends reminders to users who have active habits and haven't checked in today.
    
    Note: Set a REMINDER_CRON_SECRET environment variable and pass it as a query parameter
    to prevent unauthorized access.
    """
    import os
    
    # Verify secret key
    expected_secret = os.getenv("REMINDER_CRON_SECRET", "change-me-in-production")
    if secret_key != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid secret key"
        )
    
    try:
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Get all active habits
        active_habits = await db.habits.find({
            "status": "active"
        }).to_list(1000)
        
        reminders_sent = 0
        
        for habit in active_habits:
            partnership_id = habit.get("partnership_id")
            if not partnership_id:
                continue
            
            # Convert to ObjectId if string
            if isinstance(partnership_id, str):
                partnership_id = ObjectId(partnership_id)
            
            # Get partnership
            partnership = await db.partnerships.find_one({"_id": partnership_id})
            if not partnership:
                continue
            
            user1_id = str(partnership["user_id_1"])
            user2_id = str(partnership["user_id_2"])
            habit_id = str(habit["_id"])
            habit_name = habit.get("habit_name", "your habit")
            
            # Check if users have checked in today
            for user_id in [user1_id, user2_id]:
                # Check if user has already checked in today
                # Convert habit_id and user_id to ObjectId for proper database query
                today_log = await db.habit_logs.find_one({
                    "habit_id": ObjectId(habit_id),
                    "user_id": ObjectId(user_id),
                    "log_date": today,
                    "completed": True
                })
                
                # Only send reminder if user hasn't checked in yet today
                if not today_log:
                    try:
                        await notification_service.send_habit_reminder_notification(
                            user_id=user_id,
                            habit_id=habit_id,
                            habit_name=habit_name
                        )
                        reminders_sent += 1
                    except Exception as e:
                        if not DEMO_MODE:
                            print(f"Warning: Failed to send reminder to user {user_id} for habit {habit_id}: {e}")
        
        return {
            "success": True,
            "message": f"Sent {reminders_sent} checkin reminder notifications",
            "reminders_sent": reminders_sent
        }
        
    except Exception as e:
        if not DEMO_MODE:
            print(f"Error sending checkin reminders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send checkin reminders: {str(e)}"
        )
