from pydantic import BaseModel, Field
from typing import Optional, Dict
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


class HabitFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTH = "month"
    # CUSTOM = "custom"


class HabitStatus(str, Enum):
    PENDING_APPROVAL = "pending_approval"
    ACTIVE = "active"


class HabitBase(BaseModel):
    habit_name: str = Field(..., min_length=1, max_length=100)
    habit_type: HabitType
    category: HabitCategory
    description: Optional[str] = None
    streak: int = Field(default=0)  # NEW
    goal: Dict[str, UserGoal] = Field(
        default_factory=dict,
        description="Per-user goals. Key: user_id, Value: UserGoal object"
    )

        # streak
        # user1
        # goal_for_user1
        # progress for goal_user1
        # user2
        # goal_for_user2
        # progress for goal_user2
        #





class HabitCreate(HabitBase):
    partnership_id: str


class HabitUpdate(BaseModel):
    habit_name: Optional[str] = None
    habit_type: Optional[HabitType] = None
    category: Optional[HabitCategory] = None
    description: Optional[str] = None
    frequency: Optional[HabitFrequency] = None  # default value


class Habit(HabitBase):
    id: str = Field(alias="_id")
    partnership_id: str
    created_by: str
    status: HabitStatus = HabitStatus.PENDING_APPROVAL
    count_checkins: int = Field(default=0)  # for percentage later down the line
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
    goal: Optional[str]  # NEW
    count_checkins: int  # NEW - expose current check-in count
    frequency: str  # NEW
    partnership_id: str
    status: str
    created_by: str
    created_at: datetime


class PresetHabit(BaseModel):
    name: str
    type: HabitType
    category: HabitCategory
    description: str
    goal: Optional[str] = None  # NEW
    frequency: HabitFrequency = HabitFrequency.DAILY  # NEW
