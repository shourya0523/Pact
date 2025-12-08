from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class HabitLogCreate(BaseModel):
    completed: bool
    value: Optional[float] = Field(default=None, description="Value for completion goals (e.g., miles run, pages read)")
    
    @field_validator('value')
    @classmethod
    def validate_value(cls, v):
        """Validate that value is >= 0 if provided"""
        if v is not None and v < 0:
            raise ValueError('value must be >= 0')
        return v

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