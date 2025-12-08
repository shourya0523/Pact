from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class StreakItemResponse(BaseModel):
    """Individual habit streak for display in Streaks section"""
    habit_id: str
    habit_name: str
    current_streak: int
    category: str


class TodayGoalItemResponse(BaseModel):
    """Individual habit for today's check-in section"""
    habit_id: str
    habit_name: str
    checked_in_today: bool
    category: str


class PartnerActivityItemResponse(BaseModel):
    """Individual partner activity item for Partner Progress section"""
    partner_name: str
    habit_name: str
    checked_in_at: datetime
    hours_ago: int


class PartnershipSummaryResponse(BaseModel):
    """Partnership overview for homepage"""
    partner_name: str
    partner_username: str
    total_active_habits: int


class UserSummaryResponse(BaseModel):
    """User info for homepage greeting"""
    display_name: str
    username: str


class ActivitySummaryResponse(BaseModel):
    """Activity summary statistics for homepage visualization"""
    total_partners: int
    total_habits: int
    total_goals: int
    total_checkins: int


class DashboardHomeResponse(BaseModel):
    """Complete homepage data response"""
    user: UserSummaryResponse
    streaks: List[StreakItemResponse]
    todays_goals: List[TodayGoalItemResponse]
    partner_progress: List[PartnerActivityItemResponse]
    partnership: PartnershipSummaryResponse
    activity_summary: ActivitySummaryResponse