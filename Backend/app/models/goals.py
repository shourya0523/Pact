from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class GoalType(str, Enum):
    """Type of goal"""
    FREQUENCY = "frequency"  # e.g., "3x per week for 40 weeks"
    COMPLETION = "completion"  # e.g., "Complete marathon" (one-time)


class TimeUnit(str, Enum):
    """Time units for frequency goals"""
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class GoalStatus(str, Enum):
    """Status of the goal"""
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class UserGoal(BaseModel):
    """Goal data for a single user within a habit - embedded in Habit model"""
    goal_type: GoalType
    goal_name: str = Field(..., min_length=1, max_length=200)

    # For FREQUENCY goals only
    frequency_count: Optional[int] = Field(
        None,
        ge=1,
        description="How many times per time unit (e.g., 3 in '3x per week')"
    )
    frequency_unit: Optional[TimeUnit] = Field(
        None,
        description="Time unit for frequency (day/week/month)"
    )
    duration_count: Optional[int] = Field(
        None,
        ge=1,
        description="Duration in time units (e.g., 40 in 'for 40 weeks')"
    )
    duration_unit: Optional[TimeUnit] = Field(
        None,
        description="Must match frequency_unit (day/week/month)"
    )

    # Progress tracking (moved from habit level to per-user)
    goal_progress: int = Field(default=0, ge=0, description="Current progress")
    count_checkins: int = Field(default=0, ge=0, description="Number of check-ins completed")
    checked_in: bool = Field(default=False, description="Checked in for current period")

    # Dates
    goal_start_date: datetime = Field(default_factory=datetime.utcnow)
    goal_end_date: Optional[datetime] = Field(None, description="Calculated end date")
    goal_status: GoalStatus = Field(default=GoalStatus.ACTIVE)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('duration_unit')
    @classmethod
    def validate_matching_units(cls, v, info):
        """Ensure frequency_unit and duration_unit match"""
        if v is not None and info.data.get('frequency_unit') is not None:
            if v != info.data['frequency_unit']:
                raise ValueError(
                    f"duration_unit ({v}) must match frequency_unit ({info.data['frequency_unit']})"
                )
        return v

    @field_validator('frequency_count', 'frequency_unit', 'duration_count', 'duration_unit')
    @classmethod
    def validate_frequency_fields(cls, v, info):
        """Validate frequency fields are set correctly based on goal_type"""
        goal_type = info.data.get('goal_type')
        field_name = info.field_name

        if goal_type == GoalType.FREQUENCY:
            if v is None:
                raise ValueError(f"{field_name} is required for FREQUENCY goals")
        elif goal_type == GoalType.COMPLETION:
            if v is not None:
                raise ValueError(f"{field_name} should be None for COMPLETION goals")
        return v

    @property
    def total_checkins_required(self) -> Optional[int]:
        """Calculate total check-ins needed"""
        if self.goal_type == GoalType.FREQUENCY:
            return self.frequency_count * self.duration_count
        elif self.goal_type == GoalType.COMPLETION:
            return 1
        return None

    @property
    def is_completed(self) -> bool:
        """Check if goal is completed"""
        if self.goal_type == GoalType.COMPLETION:
            return self.count_checkins >= 1
        elif self.goal_type == GoalType.FREQUENCY:
            return self.count_checkins >= self.total_checkins_required
        return False

    @property
    def progress_percentage(self) -> float:
        """Calculate progress percentage"""
        total_required = self.total_checkins_required
        if total_required and total_required > 0:
            return min(100.0, (self.count_checkins / total_required) * 100)
        return 0.0


# Request/Response models for goal operations
class SetGoalRequest(BaseModel):
    """Request to set/update a goal for a user in a habit"""
    goal_type: GoalType
    goal_name: str = Field(..., min_length=1, max_length=200)

    # Frequency fields (required for FREQUENCY goals)
    frequency_count: Optional[int] = Field(None, ge=1)
    frequency_unit: Optional[TimeUnit] = None
    duration_count: Optional[int] = Field(None, ge=1)
    duration_unit: Optional[TimeUnit] = None


class UpdateGoalRequest(BaseModel):
    """Request to update specific fields of a user's goal"""
    goal_name: Optional[str] = Field(None, min_length=1, max_length=200)
    goal_status: Optional[GoalStatus] = None
    goal_end_date: Optional[datetime] = None


class CheckInRequest(BaseModel):
    """Request to check in for a user's goal"""
    notes: Optional[str] = Field(None, max_length=500)


class UserGoalResponse(BaseModel):
    """Response for a single user's goal with habit context"""
    user_id: str
    habit_id: str
    habit_name: str

    # Goal details
    goal_type: str
    goal_name: str

    # Frequency details (null for completion goals)
    frequency_count: Optional[int]
    frequency_unit: Optional[str]
    duration_count: Optional[int]
    duration_unit: Optional[str]

    # Progress
    goal_progress: int
    count_checkins: int
    total_checkins_required: Optional[int]
    progress_percentage: float
    is_completed: bool
    checked_in: bool

    # Status & dates
    goal_status: str
    goal_start_date: datetime
    goal_end_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime