from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class StreakHistoryBase(BaseModel):
    """Base model for streak history - contains common fields"""
    partnership_id: str
    habit_id: str
    streak_start_date: datetime
    streak_end_date: Optional[datetime] = None
    streak_length_days: int
    ended_reason: Optional[str] = None

class StreakHistoryCreate(StreakHistoryBase):
    """Model for creating new streak history records"""
    pass

class StreakHistoryUpdate(BaseModel):
    """Model for updating existing streak history records"""
    streak_end_date: Optional[datetime] = None
    ended_reason: Optional[str] = None

class StreakHistoryResponse(StreakHistoryBase):
    """Model for API responses - includes database fields"""
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StreakHistoryLeaderboard(BaseModel):
    """Model for leaderboard responses - includes user and habit names"""
    id: str
    partnership_id: str
    habit_id: str
    streak_length_days: int
    streak_start_date: datetime
    streak_end_date: Optional[datetime] = None
    user_id: str
    habit_name: str
    partner_name: str
