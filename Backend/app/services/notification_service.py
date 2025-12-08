"""
Notification Service

Handles sending notifications with preference checking.
Creates database records and sends real-time notifications via WebSocket.
"""

from bson import ObjectId
from datetime import datetime
from typing import Optional, Dict, Any
import random

from config.database import get_database
from app.services.websocket import manager
from app.models.notification import NotificationType


class NotificationService:
    """Service for managing notifications with user preference checks"""
    
    # Map notification types to preference keys
    NOTIFICATION_PREFERENCE_MAP = {
        "partnership_request": "partner_requests",
        "partner_nudge": "nudges",
        "partner_checkin": "habit_reminders",
        "habit_reminder": "habit_reminders",
        "progress_milestone": "habit_reminders",
        "missed_habit": "habit_reminders",
        "goal_reminder": "goal_reminders",
        "partner_request": "partner_requests",  # Legacy support
        "partner_completed": "habit_reminders",  # Legacy support
        "nudge": "nudges",  # Legacy support
        "milestone": "habit_reminders",  # Legacy support
        "streak_broken": "habit_reminders"  # Legacy support
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
        
        # Check user's preferences (default to True if not set)
        notification_preferences = user.get("notification_preferences", {})
        is_enabled = notification_preferences.get(preference_key, True)  # Default to enabled
        
        print(f"📋 User {user_id} preference for {preference_key}: {is_enabled}")
        return is_enabled
    
    async def send_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        message: Optional[str] = None,
        description: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        partnership_id: Optional[str] = None,
        related_id: Optional[str] = None,
        related_user_id: Optional[str] = None,
        skip_preference_check: bool = False
    ):
        """
        Send a notification to a user (checks preferences first)
        
        Args:
            user_id: Target user's ID
            notification_type: Type of notification
            title: Notification title
            message: Notification message (optional, used as description if description not provided)
            description: Notification description (optional)
            data: Additional data to include in notification
            partnership_id: Optional partnership ID for context
            related_id: Optional related ID (habit_id, request_id, etc.)
            related_user_id: Optional related user ID (partner who triggered)
            skip_preference_check: If True, skip preference check (for critical notifications)
        """
        # Step 1: Check if user wants this notification (unless skipped)
        if not skip_preference_check:
            if not await self.check_user_preferences(user_id, notification_type):
                print(f"🚫 Notification blocked by user preferences: {user_id} - {notification_type}")
                return
        
        db = get_database()
        
        # Use message as description if description not provided
        final_description = description or message or ""
        
        # Step 2: Store notification in database (using 'type' field to match models)
        notification_doc = {
            "user_id": ObjectId(user_id),
            "type": notification_type,
            "title": title,
            "message": final_description,
            "is_read": False,
            "action_taken": False,
            "created_at": datetime.utcnow()
        }
        
        # Add optional fields
        if partnership_id:
            notification_doc["partnership_id"] = ObjectId(partnership_id)
        if related_id:
            notification_doc["related_id"] = related_id
        if related_user_id:
            notification_doc["related_user_id"] = related_user_id
        
        result = await db.notifications.insert_one(notification_doc)
        notification_id = str(result.inserted_id)
        
        print(f"💾 Notification saved to DB: {notification_id}")
        
        # Step 3: Send via WebSocket if user is connected
        websocket_message = {
            "id": notification_id,
            "type": notification_type,
            "title": title,
            "message": final_description,
            "data": data or {},
            "created_at": datetime.utcnow().isoformat(),
            "is_read": False,
            "related_id": related_id,
            "related_user_id": related_user_id
        }
        
        await manager.send_notification(user_id, websocket_message)
    
    async def send_partner_request_notification(
        self,
        receiver_id: str,
        sender_id: str,
        sender_username: str,
        request_id: str,
        message: Optional[str] = None
    ):
        """
        Send notification when a partner request is received
        
        Args:
            receiver_id: User receiving the request
            sender_id: User sending the request
            sender_username: Username of sender for display
            request_id: Partnership request ID
            message: Optional custom message
        """
        # Playful partnership request messages
        request_messages = [
            f"🎉 {sender_username} wants to be your accountability buddy! Ready to level up together?",
            f"✨ {sender_username} is inviting you to build amazing habits together! Let's do this!",
            f"🚀 {sender_username} thinks you'd make a great partner! Accept to start your journey!",
            f"💪 {sender_username} wants to team up! Two is better than one when building habits!",
            f"🌟 {sender_username} sent you a partnership request! Time to find your rhythm together!",
        ]
        
        selected_message = message or random.choice(request_messages)
        
        await self.send_notification(
            user_id=receiver_id,
            notification_type=NotificationType.PARTNERSHIP_REQUEST,
            title=f"🤝 Partnership Request from {sender_username}!",
            message=selected_message,
            related_id=request_id,
            related_user_id=sender_id,
            data={
                "sender_id": sender_id,
                "sender_username": sender_username,
                "request_id": request_id
            }
        )
    
    async def send_partner_checkin_notification(
        self,
        user_id: str,
        partner_user_id: str,
        partner_username: str,
        habit_id: str,
        habit_name: str,
        partnership_id: Optional[str] = None
    ):
        """
        Send notification when partner completes a habit with gamified messages
        
        Args:
            user_id: User to notify
            partner_user_id: Partner who checked in
            partner_username: Partner's username
            habit_id: Habit ID
            habit_name: Name of the habit completed
            partnership_id: Optional partnership ID for context
        """
        # Gamified taunting messages to motivate users - more playful and creative!
        taunting_messages = [
            f"🏃 {partner_username} just crushed {habit_name}! They're leaving you in the dust! Time to catch up!",
            f"💪 Your partner {partner_username} is absolutely DOMINATING {habit_name}! Can you match that energy?",
            f"⚡ {partner_username} checked in for {habit_name}! They're on fire! 🔥 Don't let them win!",
            f"🎯 {partner_username} is WINNING on {habit_name}! This is your moment to shine!",
            f"🔥 {partner_username} just logged {habit_name}! The competition is heating up! Your move!",
            f"🚀 {partner_username} is ahead on {habit_name}! Time to launch yourself into action!",
            f"💥 {partner_username} checked in! They're showing off! Show them what you're made of!",
            f"📈 {partner_username} is climbing the leaderboard on {habit_name}! Don't let them get too far!",
            f"⭐ {partner_username} is a HABIT STAR with {habit_name}! Can you outshine them?",
            f"🎪 {partner_username} just performed {habit_name}! The show must go on - your turn!",
            f"🏆 {partner_username} is taking the crown on {habit_name}! Time to claim your throne!",
            f"💎 {partner_username} is sparkling with {habit_name}! Add your shine to the mix!",
            f"🎨 {partner_username} just painted success with {habit_name}! Time to create your masterpiece!",
            f"🎸 {partner_username} is rocking {habit_name}! Join the band and make some noise!",
            f"🌊 {partner_username} is riding the wave on {habit_name}! Catch up and surf together!",
        ]
        
        selected_message = random.choice(taunting_messages)
        
        # Playful titles
        title_options = [
            f"🎉 {partner_username} just checked in!",
            f"⚡ {partner_username} is crushing it!",
            f"🔥 {partner_username} is on fire!",
            f"💪 {partner_username} is winning!",
            f"🚀 {partner_username} is ahead!",
        ]
        
        await self.send_notification(
            user_id=user_id,
            notification_type=NotificationType.PARTNER_CHECKIN,
            title=random.choice(title_options),
            message=selected_message,
            related_id=habit_id,
            related_user_id=partner_user_id,
            partnership_id=partnership_id,
            data={
                "partner_username": partner_username,
                "habit_name": habit_name,
                "habit_id": habit_id
            }
        )
    
    async def send_goal_reminder_notification(
        self,
        user_id: str,
        goal_name: str,
        partnership_id: Optional[str] = None
    ):
        """
        Send goal reminder notification
        
        Args:
            user_id: User to notify
            goal_name: Name of the goal
            partnership_id: Optional partnership ID
        """
        await self.send_notification(
            user_id=user_id,
            notification_type=NotificationType.HABIT_REMINDER,
            title="Goal Reminder",
            message=f"Don't forget about your goal: {goal_name}",
            data={"goal_name": goal_name},
            partnership_id=partnership_id
        )
    
    async def send_goal_milestone_notification(
        self,
        user_id: str,
        goal_name: str,
        milestone_percentage: int,
        habit_id: str,
        habit_name: str,
        partnership_id: Optional[str] = None
    ):
        """
        Send notification when user reaches a goal milestone
        
        Args:
            user_id: User to notify
            goal_name: Name of the goal
            milestone_percentage: Percentage reached (25, 50, 75, 100)
            habit_id: Habit ID
            habit_name: Name of the habit
            partnership_id: Optional partnership ID
        """
        # Different messages based on milestone percentage
        if milestone_percentage == 25:
            milestone_messages = [
                f"🎉 You're 25% there! '{goal_name}' for {habit_name} is looking good! Keep the momentum!",
                f"🌟 Quarter way to victory! You've hit 25% on '{goal_name}'! The journey begins!",
                f"🚀 25% complete on '{goal_name}'! You're building something amazing with {habit_name}!",
                f"💪 First milestone unlocked! 25% of '{goal_name}' achieved! You're unstoppable!",
            ]
        elif milestone_percentage == 50:
            milestone_messages = [
                f"🎯 HALFWAY HERO! You've reached 50% of '{goal_name}' for {habit_name}! You're crushing it!",
                f"🔥 50% COMPLETE! You're halfway to your '{goal_name}' goal! The finish line is in sight!",
                f"⭐ You're at the halfway point! 50% of '{goal_name}' done! Keep pushing forward!",
                f"🏆 MIDPOINT MASTER! 50% achieved on '{goal_name}'! You're doing amazing!",
            ]
        elif milestone_percentage == 75:
            milestone_messages = [
                f"💎 ALMOST THERE! 75% of '{goal_name}' for {habit_name} complete! You're so close!",
                f"🚀 Three-quarters done! 75% of '{goal_name}' achieved! The final push awaits!",
                f"🌟 You're in the home stretch! 75% complete on '{goal_name}'! Finish strong!",
                f"🔥 75% DONE! You're almost at the finish line for '{goal_name}'! Don't stop now!",
            ]
        else:  # 100%
            milestone_messages = [
                f"🎉🎉🎉 GOAL ACHIEVED! 100% COMPLETE! You did it! '{goal_name}' for {habit_name} is DONE!",
                f"🏆 CHAMPION! You've reached 100% of '{goal_name}'! You're absolutely incredible!",
                f"⭐ PERFECTION! 100% achieved on '{goal_name}'! You're a habit-building legend!",
                f"💪 MISSION ACCOMPLISHED! 100% complete! '{goal_name}' is conquered! You're unstoppable!",
            ]
        
        selected_message = random.choice(milestone_messages)
        
        await self.send_notification(
            user_id=user_id,
            notification_type=NotificationType.PROGRESS_MILESTONE,
            title=f"🎯 {milestone_percentage}% Milestone Reached!",
            message=selected_message,
            related_id=habit_id,
            partnership_id=partnership_id,
            data={
                "goal_name": goal_name,
                "milestone_percentage": milestone_percentage,
                "habit_name": habit_name,
                "habit_id": habit_id
            }
        )
    
    async def send_partner_nudge_notification(
        self,
        recipient_user_id: str,
        sender_user_id: str,
        sender_username: str,
        habit_id: str,
        habit_name: str
    ):
        """
        Send nudge notification to a partner
        
        Args:
            recipient_user_id: User receiving the nudge
            sender_user_id: User sending the nudge
            sender_username: Sender's username
            habit_id: Habit ID
            habit_name: Habit name
        """
        # Playful nudge messages
        nudge_messages = [
            f"👋 {sender_username} is gently poking you about {habit_name}! Time to get moving!",
            f"💫 {sender_username} thinks it's the perfect time for {habit_name}! What do you say?",
            f"🎯 {sender_username} is calling you out on {habit_name}! Ready to answer the call?",
            f"⚡ {sender_username} is giving you a friendly nudge for {habit_name}! Let's do this!",
            f"🌟 {sender_username} is cheering you on to tackle {habit_name}! You've got this!",
            f"🚀 {sender_username} wants to see you crush {habit_name}! Time to show them!",
            f"💪 {sender_username} believes in you for {habit_name}! Prove them right!",
            f"🔥 {sender_username} is lighting a fire under {habit_name}! Let's burn bright!",
        ]
        
        selected_message = random.choice(nudge_messages)
        
        # Playful titles
        title_options = [
            f"👆 {sender_username} is nudging you!",
            f"💬 {sender_username} has a message!",
            f"🎯 {sender_username} is calling!",
            f"⚡ {sender_username} wants your attention!",
        ]
        
        await self.send_notification(
            user_id=recipient_user_id,
            notification_type=NotificationType.PARTNER_NUDGE,
            title=random.choice(title_options),
            message=selected_message,
            related_id=habit_id,
            related_user_id=sender_user_id,
            data={
                "sender_username": sender_username,
                "habit_name": habit_name,
                "habit_id": habit_id
            }
        )
    
    async def send_habit_reminder_notification(
        self,
        user_id: str,
        habit_id: str,
        habit_name: str
    ):
        """
        Send daily habit reminder notification
        
        Args:
            user_id: User to notify
            habit_id: Habit ID
            habit_name: Habit name
        """
        # Playful reminder messages
        reminder_messages = [
            f"⏰ Time to check in for {habit_name}! Your future self will thank you!",
            f"🌟 Don't forget about {habit_name}! Small steps lead to big wins!",
            f"💪 Ready to tackle {habit_name}? You've got this!",
            f"🎯 {habit_name} is calling your name! Time to answer!",
            f"🚀 Your {habit_name} habit is waiting! Let's make today count!",
            f"✨ It's {habit_name} o'clock! Time to shine!",
            f"🔥 Don't break the streak! Time for {habit_name}!",
            f"💎 {habit_name} time! You're building something amazing!",
        ]
        
        selected_message = random.choice(reminder_messages)
        
        # Playful titles
        title_options = [
            f"⏰ Reminder: {habit_name}",
            f"💫 Time for {habit_name}!",
            f"🎯 {habit_name} Check-in",
            f"⚡ Don't forget {habit_name}!",
        ]
        
        await self.send_notification(
            user_id=user_id,
            notification_type=NotificationType.HABIT_REMINDER,
            title=random.choice(title_options),
            message=selected_message,
            related_id=habit_id,
            data={
                "habit_name": habit_name,
                "habit_id": habit_id
            }
        )
    
    async def send_missed_habit_notification(
        self,
        user_id: str,
        habit_id: str,
        habit_name: str
    ):
        """
        Send notification when user misses a habit check-in
        
        Args:
            user_id: User to notify
            habit_id: Habit ID
            habit_name: Habit name
        """
        # Encouraging messages for missed habits (positive, not shaming)
        missed_messages = [
            f"💪 Oops! You missed {habit_name} yesterday. No worries - today is a fresh start!",
            f"🌟 Everyone has off days! {habit_name} is waiting for you today - let's get back on track!",
            f"🔄 Yesterday's {habit_name} didn't happen, but today is your chance to shine!",
            f"✨ Don't let one missed day stop you! {habit_name} is ready for you today!",
            f"🚀 You missed {habit_name}? No problem! Jump back in and keep going!",
            f"💎 One missed check-in doesn't define you! {habit_name} is calling - answer it today!",
            f"🔥 Yesterday's {habit_name} is in the past. Today's success is in your hands!",
            f"⭐ Every champion has setbacks. Time to bounce back with {habit_name}!",
        ]
        
        selected_message = random.choice(missed_messages)
        
        # Encouraging titles
        title_options = [
            f"💪 Missed {habit_name}? No worries!",
            f"🔄 Fresh start for {habit_name}!",
            f"✨ {habit_name} is waiting!",
            f"🌟 Back on track with {habit_name}!",
        ]
        
        await self.send_notification(
            user_id=user_id,
            notification_type=NotificationType.MISSED_HABIT,
            title=random.choice(title_options),
            message=selected_message,
            related_id=habit_id,
            data={
                "habit_name": habit_name,
                "habit_id": habit_id
            }
        )


# Global notification service instance
notification_service = NotificationService()