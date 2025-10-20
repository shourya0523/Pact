from pydantic import BaseModel, Field, EmailStr
from typing import Optional
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


# Internal database models (not exposed in API)
class PartnerRequestDB(BaseModel):
    """Database model for partner_requests collection"""
    sender_id: PyObjectId
    receiver_id: PyObjectId
    status: str = "pending"
    message: Optional[str] = None
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    responded_at: Optional[datetime] = None


class PartnershipDB(BaseModel):
    """Database model for partnerships collection"""
    user_id_1: PyObjectId
    user_id_2: PyObjectId
    status: str = PartnershipStatus.ACTIVE.value
    current_streak: int = 0
    longest_streak: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)