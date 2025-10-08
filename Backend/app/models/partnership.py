from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId
from enum import Enum


class PartnershipStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"


class PartnershipBase(BaseModel):
    user_id_1: str
    user_id_2: str


class PartnershipCreate(BaseModel):
    partner_username: str  # For direct invite by username


class Partnership(BaseModel):
    id: str = Field(alias="_id")
    user_id_1: str
    user_id_2: str
    status: PartnershipStatus = PartnershipStatus.ACTIVE
    current_streak: int = 0
    total_points: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class PartnershipResponse(BaseModel):
    id: str
    partner_username: str
    partner_email: str
    status: str
    current_streak: int
    total_points: int
    created_at: datetime


class PartnerRequest(BaseModel):
    id: str = Field(alias="_id")
    sender_id: str
    recipient_email: Optional[str] = None
    recipient_username: Optional[str] = None
    status: str = "pending"  # pending, accepted, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}