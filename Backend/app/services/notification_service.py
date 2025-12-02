"""
Notification Service

Handles sending notifications with preference checking.
Creates database records and sends real-time notifications via WebSocket.
"""

from bson import ObjectId
from datetime import datetime
from typing import Optional, Dict, Any

from config.database import get_database
from app.services.websocket import manager


class NotificationService:
    """Service for managing notifications with user preference checks"""
    
    # Map notification types to preference keys
    NOTIFICATION_PREFERENCE_MAP = {
        "partner_request": "partner_requests",
        "partner_completed": "habit_reminders",
        "nudge": "nudges",
        "goal_reminder": "goal_reminders",
        "habit_reminder": "habit_reminders",
        "streak_broken": "habit_reminders",
        "milestone": "habit_reminders"
    }
    
    async def check_user_preferences(
        self, 
        user_id: str, 
        notification_type: str
    ) -> bool:
        """
        Check if user has enabled this notification type
        
        takes in:
            user_id: User's ID
            notification_type: Type of notification (partner_request, nudge, etc.)
            
        Returns:
            bool: True if user wants this notification, False otherwise
        """
        db = get_database()
        
        # Get user's notification preferences
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            print(f"⚠️ User {user_id} not found")
            return False
        
        # Get the preference key for this notification type
        preference_key = self.NOTIFICATION_PREFERENCE_MAP.get(notification_type)
        
        if not preference_key:
            print(f"⚠️ Unknown notification type: {notification_type}")
            return False
        
        # Check user's preferences
        notification_preferences = user.get("notification_preferences", {})
        is_enabled = notification_preferences.get(preference_key, False)
        
        print(f"📋 User {user_id} preference for {preference_key}: {is_enabled}")
        return is_enabled
    
    async def send_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        description: str,
        data: Optional[Dict[str, Any]] = None,
        partnership_id: Optional[str] = None
    ):
        """
        Send a notification to a user (checks preferences first)
        
        takes in:
            user_id: Target user's ID
            notification_type: Type of notification
            title: Notification title
            description: Notification description
            data: Additional data to include in notification
            partnership_id: Optional partnership ID for context
        """
        # Step 1: Check if user wants this notification
        if not await self.check_user_preferences(user_id, notification_type):
            print(f"🚫 Notification blocked by user preferences: {user_id} - {notification_type}")
            return
        
        db = get_database()
        
        # Step 2: Store notification in database
        notification_doc = {
            "user_id": ObjectId(user_id),
            "notification_type": notification_type,
            "title": title,
            "description": description,
            "is_read": False,
            "created_at": datetime.utcnow()
        }
        
        # Add partnership_id if provided
        if partnership_id:
            notification_doc["partnership_id"] = ObjectId(partnership_id)
        
        result = await db.notifications.insert_one(notification_doc)
        notification_id = str(result.inserted_id)
        
        print(f"💾 Notification saved to DB: {notification_id}")
        
        # Step 3: Send via WebSocket if user is connected
        websocket_message = {
            "id": notification_id,
            "type": notification_type,
            "title": title,
            "description": description,
            "data": data or {},
            "created_at": datetime.utcnow().isoformat(),
            "is_read": False
        }
        
        await manager.send_notification(user_id, websocket_message)
    
    async def send_partner_request_notification(
        self,
        receiver_id: str,
        sender_id: str,
        sender_username: str
    ):
        """
        Send notification when a partner request is received
        
        takes in:
            receiver_id: User receiving the request
            sender_id: User sending the request
            sender_username: Username of sender for display
        """
        await self.send_notification(
            user_id=receiver_id,
            notification_type="partner_request",
            title="New Partner Request",
            description=f"{sender_username} sent you a partnership request",
            data={
                "sender_id": sender_id,
                "sender_username": sender_username
            }
        )
    
    async def send_partner_checkin_notification(
        self,
        user_id: str,
        partner_username: str,
        habit_name: str,
        partnership_id: str
    ):
        """
        Send notification when partner completes a habit
        
        takes in:
            user_id: User to notify
            partner_username: Partner who checked in
            habit_name: Name of the habit completed
            partnership_id: Partnership ID for context
        """
        await self.send_notification(
            user_id=user_id,
            notification_type="partner_completed",
            title="Partner Checked In!",
            description=f"{partner_username} completed {habit_name}",
            data={
                "partner_username": partner_username,
                "habit_name": habit_name
            },
            partnership_id=partnership_id
        )
    
    async def send_goal_reminder_notification(
        self,
        user_id: str,
        goal_name: str,
        partnership_id: Optional[str] = None
    ):
        """
        Send goal reminder notification
        
        takes in:
            user_id: User to notify
            goal_name: Name of the goal
            partnership_id: Optional partnership ID
        """
        await self.send_notification(
            user_id=user_id,
            notification_type="goal_reminder",
            title="Goal Reminder",
            description=f"Don't forget about your goal: {goal_name}",
            data={"goal_name": goal_name},
            partnership_id=partnership_id
        )


# Global notification service instance
notification_service = NotificationService()