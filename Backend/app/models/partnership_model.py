from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from enum import Enum


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)


class PartnershipStatus(str, Enum):
    """Partnership status enum matching schema"""
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    BROKEN = "broken"


class PartnershipCreate(BaseModel):
    """Request model for creating partnership invite"""
    partner_username: str
    message: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "partner_username": "john_doe",
                "message": "Let's build habits together!"
            }
        }


class PartnershipResponse(BaseModel):
    """Response model for partnership data"""
    id: str
    partner_username: str
    partner_email: str
    status: str
    current_streak: int
    longest_streak: int
    created_at: datetime


class PartnerRequestResponse(BaseModel):
    """Response model for partner request"""
    id: str
    sender_username: str
    sender_email: str
    message: Optional[str] = None
    sent_at: datetime
    status: str = "pending"


class PartnerInfo(BaseModel):
    """Partner information model"""
    username: str
    email: str
    profile_picture: Optional[str] = None


class HabitSummary(BaseModel):
    """Summary of a habit for partnership responses"""
    id: str
    name: str
    type: Optional[str] = None
    frequency: Optional[str] = None
    current_streak: int


class PartnershipDetailResponse(BaseModel):
    """Detailed response model for current partnership"""
    id: str
    partner: PartnerInfo
    status: str
    partnership_age_days: int
    current_streak: int
    longest_streak: int
    created_at: datetime
    habits: List[HabitSummary]
    
    class Config:
        schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "partner": {
                    "username": "jane_doe",
                    "email": "jane@example.com",
                    "profile_picture": "https://example.com/avatar.jpg"
                },
                "status": "active",
                "partnership_age_days": 45,
                "current_streak": 12,
                "longest_streak": 15,
                "created_at": "2024-01-01T00:00:00",
                "habits": [
                    {
                        "id": "507f1f77bcf86cd799439012",
                        "name": "Morning Run",
                        "type": "fitness",
                        "frequency": "daily",
                        "current_streak": 12
                    }
                ]
            }
        }


class HabitStatsDetail(BaseModel):
    """Detailed habit statistics"""
    habit_name: str
    current_streak: int
    longest_streak: int
    total_checkins: int
    is_active: bool


class StreakHistoryDetail(BaseModel):
    """Streak history detail"""
    habit_id: str
    streak_length_days: int
    start_date: datetime
    end_date: Optional[datetime] = None
    ended_reason: Optional[str] = None


class PartnershipStatsResponse(BaseModel):
    """Detailed statistics response for a partnership"""
    partnership_id: str
    status: str
    partnership_age_days: int
    created_at: datetime
    total_checkins: int
    milestones_achieved: int
    habits: List[HabitStatsDetail]
    streak_history: List[StreakHistoryDetail]
    
    class Config:
        schema_extra = {
            "example": {
                "partnership_id": "507f1f77bcf86cd799439011",
                "status": "active",
                "partnership_age_days": 45,
                "created_at": "2024-01-01T00:00:00",
                "total_checkins": 180,
                "milestones_achieved": 5,
                "habits": [
                    {
                        "habit_name": "Morning Run",
                        "current_streak": 12,
                        "longest_streak": 15,
                        "total_checkins": 90,
                        "is_active": True
                    }
                ],
                "streak_history": [
                    {
                        "habit_id": "507f1f77bcf86cd799439012",
                        "streak_length_days": 15,
                        "start_date": "2024-01-01T00:00:00",
                        "end_date": "2024-01-16T00:00:00",
                        "ended_reason": "missed_checkin"
                    }
                ]
            }
        }


class PartnershipHistoryItem(BaseModel):
    """Individual partnership history item"""
    id: str
    partner_username: str
    status: str
    created_at: datetime
    ended_at: Optional[datetime] = None
    duration_days: int
    habits_count: int


class SavedStreak(BaseModel):
    """Saved streak information when partnership ends"""
    habit_name: str
    streak_length: int


class EndPartnershipSummary(BaseModel):
    """Summary returned when ending a partnership"""
    partnership_id: str
    duration_days: int
    saved_streaks: List[SavedStreak]
    habits_deactivated: int


class StatusUpdateRequest(BaseModel):
    """Request model for updating partnership status"""
    new_status: str = Field(..., description="New status: active, paused, or broken")
    
    class Config:
        schema_extra = {
            "example": {
                "new_status": "paused"
            }
        }


# Internal database models (not exposed in API)
class PartnerRequestDB(BaseModel):
    """Database model for partner_requests collection"""
    sender_id: PyObjectId
    receiver_id: PyObjectId
    status: str = "pending"
    message: Optional[str] = None
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    responded_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class PartnershipDB(BaseModel):
    """Database model for partnerships collection"""
    user_id_1: PyObjectId
    user_id_2: PyObjectId
    status: str = PartnershipStatus.ACTIVE.value
    created_at: datetime = Field(default_factory=datetime.utcnow)
    paused_at: Optional[datetime] = None
    resumed_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    
    class Config:
        arbitrary_types_allowed = True