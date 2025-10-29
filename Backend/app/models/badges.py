from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BadgeBase(BaseModel):
    """Base model for badges"""
    name: str
    description: str
    category: str
    level: Optional[str] = "bronze"
    icon_url: Optional[str] = None
    criteria: Optional[dict] = None

class BadgeCreate(BadgeBase):
    """Model for creating new badges"""
    pass

class BadgeUpdate(BaseModel):
    """Model for updating badges"""
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    icon_url: Optional[str] = None
    criteria: Optional[dict] = None

class BadgeResponse(BadgeBase):
    """Model for API responses - includes database fields"""
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserBadgeBase(BaseModel):
    """Base model for user-badge relationships"""
    user_id: str
    badge_id: str
    assigned_date: datetime
    shown: bool 

class UserBadgeCreate(BaseModel):
    """Model for assigning badges to users - only needs badge_id since user_id comes from URL path"""
    badge_id: str

class UserBadgeUpdate(BaseModel):
    """Model for updating user badge display status"""
    shown: bool

class UserBadgeResponse(UserBadgeBase):
    """Response model for user badges with full badge details"""
    id: str
    badge: BadgeResponse  

    class Config:
        from_attributes = True

class UserBadgeWithUserInfo(BaseModel):
    """For API that returns users who have specific badges (KAN-82)"""
    user_badge_id: str
    user_id: str
    badge_id: str
    assigned_date: datetime
    shown: bool
    user_name: str
    user_username: str
    profile_picture: Optional[str] = None