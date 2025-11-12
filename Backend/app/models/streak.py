from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class StreakState(BaseModel):
    """
    Mirrors the `streaks` collection document shape (persistent cache).
    Use this when reading/writing the materialized streak state in Mongo.
    """
    id: Optional[str] = Field(default=None, alias="_id")
    habit_id: str
    partnership_id: str
    current_streak: int = Field(ge=0)
    longest_streak: int = Field(ge=0)
    streak_started_at: Optional[date] = None
    last_both_completed_date: Optional[date] = None
    updated_at: datetime


class StreakResponse(BaseModel):
    """
    API response model for a single habit's streak status.
    """
    habit_id: str
    partnership_id: str
    habit_name: Optional[str] = None
    current_streak: int = Field(ge=0)
    longest_streak: int = Field(ge=0)
    streak_start_date: Optional[date] = None
    last_completed_date: Optional[date] = None
    is_on_track: bool


class PartnershipStreakItem(BaseModel):
    """
    API response item for listing multiple habits' streaks in a partnership.
    """
    habit_id: str
    habit_name: str
    current_streak: int = Field(ge=0)
    longest_streak: int = Field(ge=0)
    streak_start_date: Optional[date] = None
    last_completed_date: Optional[date] = None
    is_on_track: bool


