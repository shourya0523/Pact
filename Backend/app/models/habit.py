from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId
from enum import Enum


class HabitType(str, Enum):
    BUILD = "build"
    BREAK = "break"


class HabitCategory(str, Enum):
    HEALTH = "health"
    FITNESS = "fitness"
    PRODUCTIVITY = "productivity"
    MINDFULNESS = "mindfulness"
    LEARNING = "learning"
    SOCIAL = "social"
    NUTRITION = "nutrition"
    SLEEP = "sleep"
    CUSTOM = "custom"


class HabitStatus(str, Enum):
    PENDING_APPROVAL = "pending_approval"
    ACTIVE = "active"
    ARCHIVED = "archived"


class HabitBase(BaseModel):
    habit_name: str = Field(..., min_length=1, max_length=100)
    habit_type: HabitType
    category: HabitCategory
    description: Optional[str] = None


class HabitCreate(HabitBase):
    partnership_id: str


class HabitUpdate(BaseModel):
    habit_name: Optional[str] = None
    habit_type: Optional[HabitType] = None
    category: Optional[HabitCategory] = None
    description: Optional[str] = None


class Habit(HabitBase):
    id: str = Field(alias="_id")
    partnership_id: str
    created_by: str
    status: HabitStatus = HabitStatus.ACTIVE
    pending_edit: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class HabitResponse(BaseModel):
    id: str
    habit_name: str
    habit_type: str
    category: str
    description: Optional[str]
    partnership_id: str
    status: str
    created_at: datetime


class PresetHabit(BaseModel):
    name: str
    type: HabitType
    category: HabitCategory
    description: str