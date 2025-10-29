from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class HabitLogCreate(BaseModel):
    completed: bool

class HabitLogResponse(BaseModel):
    id: str  
    habit_id: str  
    user_id: str 
    date: str 
    completed: bool
    logged_at: datetime  
    current_streak: int = 0

class TodayLogStatus(BaseModel):
    habit_id: str
    habit_name: str
    user_logs: dict
    both_completed: bool

class PartnershipTodayStatus(BaseModel):
    partnership_id: str
    date: str
    habits: list
    completion_summary: dict