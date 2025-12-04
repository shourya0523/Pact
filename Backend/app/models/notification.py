from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId
from enum import Enum


class NotificationType(str, Enum):
    PARTNER_NUDGE = "partner_nudge"
    PARTNERSHIP_REQUEST = "partnership_request"
    PARTNER_CHECKIN = "partner_checkin"
    HABIT_REMINDER = "habit_reminder"
    PROGRESS_MILESTONE = "progress_milestone"
    MISSED_HABIT = "missed_habit"


class NotificationBase(BaseModel):
    user_id: str
    type: NotificationType
    title: str
    message: Optional[str] = None
    related_id: Optional[str] = None  # Can be habit_id, partnership_id, etc.
    related_user_id: Optional[str] = None  # Partner who triggered the notification
    is_read: bool = False
    action_taken: bool = False  # For notifications that require action (accept/decline)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class NotificationCreate(BaseModel):
    user_id: str
    type: NotificationType
    title: str
    message: Optional[str] = None
    related_id: Optional[str] = None
    related_user_id: Optional[str] = None


class Notification(NotificationBase):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: Optional[str] = None
    time_ago: str
    is_read: bool
    action_taken: bool
    related_id: Optional[str] = None
    related_user_id: Optional[str] = None
    partner_username: Optional[str] = None
    partner_avatar: Optional[str] = None
    habit_name: Optional[str] = None
    created_at: datetime
