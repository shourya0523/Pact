"""
Helper functions to create notifications when certain events occur
Import and use these in your route handlers
"""

from datetime import datetime
from bson import ObjectId
from typing import Optional
import random


async def create_partner_nudge_notification(
    db,
    recipient_user_id: str,
    sender_user_id: str,
    habit_id: str,
    sender_username: str,
    habit_name: str
):
    """Create notification when partner sends a nudge"""
    notification = {
        "user_id": recipient_user_id,
        "type": "partner_nudge",
        "title": f"{sender_username} is nudging you to work on {habit_name}!",
        "message": f"Your partner thinks it's time to {habit_name}",
        "related_id": habit_id,
        "related_user_id": sender_user_id,
        "is_read": False,
        "action_taken": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.notifications.insert_one(notification)
    return str(result.inserted_id)


async def create_partnership_request_notification(
    db,
    recipient_user_id: str,
    sender_user_id: str,
    request_id: str,
    sender_username: str,
    message: Optional[str] = None
):
    """Create notification when someone sends a partnership request"""
    notification = {
        "user_id": recipient_user_id,
        "type": "partnership_request",
        "title": f"Partnership request from {sender_username}...",
        "message": message or "Accept to start building habits together!",
        "related_id": request_id,
        "related_user_id": sender_user_id,
        "is_read": False,
        "action_taken": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.notifications.insert_one(notification)
    return str(result.inserted_id)


async def create_partner_checkin_notification(
    db,
    recipient_user_id: str,
    partner_user_id: str,
    habit_id: str,
    partner_username: str,
    habit_name: str
):
    """Create notification when partner checks in with gamified taunting messages"""
    # Gamified taunting messages to motivate users
    taunting_messages = [
        f"{partner_username} just checked in for {habit_name}! Don't let them get ahead! 🏃",
        f"Your partner {partner_username} is crushing it on {habit_name}! Your turn! 💪",
        f"{partner_username} checked in! Time to catch up on {habit_name}! ⚡",
        f"{partner_username} is winning on {habit_name}! Can you keep up? 🎯",
        f"Your partner {partner_username} just checked in for {habit_name}! Don't break the streak! 🔥",
        f"{partner_username} is ahead on {habit_name}! Time to step up! 🚀",
        f"Your partner {partner_username} checked in for {habit_name}! Are you going to let them win? 💥",
        f"{partner_username} just logged {habit_name}! Don't fall behind! 📈",
        f"Your partner {partner_username} is on fire with {habit_name}! Match their energy! ⭐",
        f"{partner_username} checked in! Time to show them what you've got on {habit_name}! 🎪",
    ]
    
    # Randomly select a taunting message
    selected_message = random.choice(taunting_messages)
    
    notification = {
        "user_id": recipient_user_id,
        "type": "partner_checkin",
        "title": f"{partner_username} checked in today!",
        "message": selected_message,
        "related_id": habit_id,
        "related_user_id": partner_user_id,
        "is_read": False,
        "action_taken": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.notifications.insert_one(notification)
    return str(result.inserted_id)


async def create_habit_reminder_notification(
    db,
    user_id: str,
    habit_id: str,
    habit_name: str
):
    """Create daily habit reminder notification"""
    notification = {
        "user_id": user_id,
        "type": "habit_reminder",
        "title": f"Check in for your {habit_name}...",
        "message": "Time to work on your habit!",
        "related_id": habit_id,
        "is_read": False,
        "action_taken": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.notifications.insert_one(notification)
    return str(result.inserted_id)


async def create_progress_milestone_notification(
    db,
    user_id: str,
    habit_id: str,
    habit_name: str,
    milestone_percentage: int
):
    """Create notification for progress milestones (25%, 50%, 75%, 100%)"""
    notification = {
        "user_id": user_id,
        "type": "progress_milestone",
        "title": f"You have reached {milestone_percentage}% progress on your {habit_name}...",
        "message": f"You're {milestone_percentage}% of the way there! Keep going!",
        "related_id": habit_id,
        "is_read": False,
        "action_taken": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.notifications.insert_one(notification)
    return str(result.inserted_id)


async def create_missed_habit_notification(
    db,
    user_id: str,
    habit_id: str,
    habit_name: str
):
    """Create notification when user misses a habit check-in"""
    notification = {
        "user_id": user_id,
        "type": "missed_habit",
        "title": f"Ups, You have missed your {habit_name}...",
        "message": "Don't worry, get back on track today!",
        "related_id": habit_id,
        "is_read": False,
        "action_taken": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.notifications.insert_one(notification)
    return str(result.inserted_id)


async def notify_partner_on_checkin(db, habit_id: str, checked_in_user_id: str):
    """
    When a user checks in, notify their partner
    Call this after a successful habit log
    """
    # Get habit and partnership info
    habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
    if not habit:
        return None
    
    partnership_id = habit.get("partnership_id")
    if isinstance(partnership_id, str):
        partnership_id = ObjectId(partnership_id)
    
    partnership = await db.partnerships.find_one({"_id": partnership_id})
    if not partnership:
        return None
    
    # Determine partner ID
    user1_id = str(partnership["user_id_1"])
    user2_id = str(partnership["user_id_2"])
    
    partner_id = user2_id if checked_in_user_id == user1_id else user1_id
    
    # Get user who checked in
    checked_in_user = await db.users.find_one({"_id": ObjectId(checked_in_user_id)})
    if not checked_in_user:
        return None
    
    # Create notification for partner
    return await create_partner_checkin_notification(
        db,
        recipient_user_id=partner_id,
        partner_user_id=checked_in_user_id,
        habit_id=habit_id,
        partner_username=checked_in_user.get("username", "Your partner"),
        habit_name=habit.get("habit_name", "your habit")
    )


# Usage examples:

"""
# In partnership_apis.py when sending partnership request:
await create_partnership_request_notification(
    db=db,
    recipient_user_id=receiver_id,
    sender_user_id=sender_id,
    request_id=str(request_result.inserted_id),
    sender_username=sender_username,
    message="Let's build habits together!"
)

# In habit_logs.py after successful check-in:
await notify_partner_on_checkin(
    db=db,
    habit_id=habit_id,
    checked_in_user_id=user_id
)

# In streaks calculation when milestone is reached:
if current_streak in [25, 50, 75, 100]:
    await create_progress_milestone_notification(
        db=db,
        user_id=user_id,
        habit_id=habit_id,
        habit_name=habit_name,
        milestone_percentage=current_streak
    )
"""
