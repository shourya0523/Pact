"""
Streak Calculation Service

Handles streak calculation logic with the following design:
- Streak counts consecutive days where BOTH partners complete a habit
- When a day is missed, streak resets to 0
- Timezone-aware: Uses user's timezone to determine "day boundary"
- Tracks current_streak and longest_streak per user per habit
"""

from datetime import datetime, timedelta, timezone, date
import asyncio
from bson import ObjectId
from typing import Optional, Dict, Tuple
import pytz


class StreakCalculationService:
    """Service for calculating and managing habit streaks"""
    # In-process hashmap cache (per worker process). This is OPTIONAL.
    # Key: habit_id (str) → {"data": Dict, "expires_at": datetime}
    streak_mem_cache: Dict[str, Dict] = {}
    CACHE_TTL_SECONDS: int = 60
    # Per-habit recompute locks to avoid concurrent recomputes/upserts (thundering herd)
    _recompute_locks: Dict[str, asyncio.Lock] = {}
    
    @staticmethod
    async def calculate_streak_for_habit(
        db,
        habit_id: str,
        partnership_id: str,
        user_timezone: Optional[str] = "UTC"
    ) -> Dict:
        """
        Calculate current streak for a habit in a partnership.
        
        Returns:
        {
            "current_streak": int,
            "longest_streak": int,
            "streak_start_date": datetime,
            "last_completed_date": datetime,
            "is_on_track": bool  # True if completed today
        }
        """
        
        # Use the layered cache: in-memory → Mongo streaks → recompute fallback
        data = await StreakCalculationService.get_streak_cached(db, habit_id, partnership_id)
        # Map to the legacy response fields expected by callers of this method
        today = date.today()
        is_on_track = data.get("last_both_completed_date") == today
        return {
            "current_streak": data.get("current_streak", 0),
            "longest_streak": data.get("longest_streak", 0),
            "streak_start_date": data.get("streak_started_at"),
            "last_completed_date": data.get("last_both_completed_date"),
            "is_on_track": is_on_track
        }
    
    @staticmethod
    async def check_and_reset_streak_if_missed(
        db,
        habit_id: str,
        partnership_id: str,
        check_date: datetime.date
    ) -> Dict:
        """
        Check if a day was missed and reset streak if necessary.
        
        This should be called daily (e.g., via scheduled task) to detect missed days.
        """
        partnership = await db.partnerships.find_one({"_id": ObjectId(partnership_id)})
        habit = await db.habits.find_one({"_id": ObjectId(habit_id)})
        
        if not partnership or not habit:
            return {"error": "Partnership or habit not found"}
        
        user1_id = partnership["user_id_1"]
        user2_id = partnership["user_id_2"]
        yesterday = check_date - timedelta(days=1)
        
        # Check if both users completed yesterday
        yesterday_logs = await db.habit_logs.find({
            "habit_id": habit_id,
            "date": yesterday,
            "completed": True
        }).to_list(length=None)
        
        yesterday_users = {log["user_id"] for log in yesterday_logs}
        
        # If either user missed, streak resets
        if user1_id not in yesterday_users or user2_id not in yesterday_users:
            return {
                "streak_reset": True,
                "reason": "User missed a day",
                "reset_date": check_date
            }
        
        return {
            "streak_reset": False,
            "reason": "Streak continues"
        }
    
    @staticmethod
    async def update_habit_streak_fields(
        db,
        habit_id: str,
        partnership_id: str,
        streak_data: Dict
    ) -> bool:
        """
        Deprecated for cache-in-streaks design. Kept for compatibility.
        """
        try:
            result = await db.habits.update_one(
                {"_id": ObjectId(habit_id)},
                {
                    "$set": {
                        "current_streak": streak_data.get("current_streak", 0),
                        "longest_streak": max(
                            streak_data.get("longest_streak", 0),
                            streak_data.get("current_streak", 0)
                        ),
                        "last_completed_date": streak_data.get("last_completed_date"),
                        "streak_updated_at": datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating streak fields: {e}")
            return False
    
    @staticmethod
    def convert_to_user_timezone(
        utc_datetime: datetime,
        timezone_str: str = "UTC"
    ) -> datetime:
        """
        Convert UTC datetime to user's timezone.
        """
        try:
            tz = pytz.timezone(timezone_str)
            return utc_datetime.astimezone(tz)
        except Exception:
            return utc_datetime
    
    @staticmethod
    def get_today_in_timezone(timezone_str: str = "UTC") -> datetime.date:
        """
        Get today's date in the user's timezone.
        """
        try:
            tz = pytz.timezone(timezone_str)
            return datetime.now(tz).date()
        except Exception:
            return datetime.utcnow().date()

    # ===== New cache-aware helpers =====
    @staticmethod
    async def get_streak_cached(db, habit_id: str, partnership_id: str) -> Dict:
        """Layered cache: in-memory hashmap (short TTL) → Mongo streaks → recompute."""
        now = datetime.utcnow()
        cached = StreakCalculationService.streak_mem_cache.get(habit_id)
        if cached and cached["expires_at"] > now:
            return cached["data"]

        # Persistent cache in Mongo
        streak = await db.streaks.find_one({"habit_id": ObjectId(habit_id)})
        if streak:
            data = {
                "current_streak": streak.get("current_streak", 0),
                "longest_streak": streak.get("longest_streak", 0),
                "streak_started_at": streak.get("streak_started_at"),
                "last_both_completed_date": streak.get("last_both_completed_date"),
                "updated_at": streak.get("updated_at"),
            }
            StreakCalculationService.streak_mem_cache[habit_id] = {
                "data": data,
                "expires_at": now + timedelta(seconds=StreakCalculationService.CACHE_TTL_SECONDS),
            }
            return data

        # Cold start: recompute and persist with per-habit lock (double-checked)
        lock = StreakCalculationService._recompute_locks.setdefault(habit_id, asyncio.Lock())
        async with lock:
            # Recheck memory inside lock
            cached2 = StreakCalculationService.streak_mem_cache.get(habit_id)
            if cached2 and cached2["expires_at"] > datetime.utcnow():
                return cached2["data"]
            # Recheck persistent cache inside lock
            streak2 = await db.streaks.find_one({"habit_id": ObjectId(habit_id)})
            if streak2:
                data2 = {
                    "current_streak": streak2.get("current_streak", 0),
                    "longest_streak": streak2.get("longest_streak", 0),
                    "streak_started_at": streak2.get("streak_started_at"),
                    "last_both_completed_date": streak2.get("last_both_completed_date"),
                    "updated_at": streak2.get("updated_at"),
                }
                StreakCalculationService.streak_mem_cache[habit_id] = {
                    "data": data2,
                    "expires_at": datetime.utcnow() + timedelta(seconds=StreakCalculationService.CACHE_TTL_SECONDS),
                }
                return data2

            data = await StreakCalculationService.recompute_streak_from_logs(db, habit_id, partnership_id)
            await StreakCalculationService.upsert_streaks(db, habit_id, partnership_id, data)
            StreakCalculationService.streak_mem_cache[habit_id] = {
                "data": data,
                "expires_at": datetime.utcnow() + timedelta(seconds=StreakCalculationService.CACHE_TTL_SECONDS),
            }
            return data

    @staticmethod
    async def recompute_streak_from_logs(db, habit_id: str, partnership_id: str) -> Dict:
        """Recompute streak purely from habit_logs (source of truth)."""
        partnership = await db.partnerships.find_one({"_id": ObjectId(partnership_id)})
        if not partnership:
            return {"current_streak": 0, "longest_streak": 0, "streak_started_at": None, "last_both_completed_date": None, "updated_at": datetime.utcnow()}

        user1_id = str(partnership["user_id_1"])
        user2_id = str(partnership["user_id_2"])

        # We need log_date for streak computation; include both legacy "date" and "log_date"
        logs = await db.habit_logs.find(
            {"habit_id": habit_id, "completed": True},
            {"user_id": 1, "log_date": 1, "date": 1}
        ).to_list(length=None)
        by_date: Dict[date, set] = {}
        for log in logs:
            d = log.get("log_date") or log.get("date")
            if not d:
                # Skip malformed log without a date field
                continue
            # Convert datetime to date if needed (log_date is stored as datetime)
            if isinstance(d, datetime):
                d = d.date()
            elif not isinstance(d, date):
                # Skip if it's neither datetime nor date
                continue
            by_date.setdefault(d, set()).add(str(log["user_id"]))

        both_days = sorted([d for d, users in by_date.items() if user1_id in users and user2_id in users])
        if not both_days:
            return {
                "current_streak": 0,
                "longest_streak": 0,
                "streak_started_at": None,
                "last_both_completed_date": None,
                "updated_at": datetime.utcnow(),
            }

        # Current streak
        today = date.today()
        anchor = today if today in both_days else (today - timedelta(days=1) if (today - timedelta(days=1)) in both_days else None)
        current = 0
        start = None
        if anchor:
            d = anchor
            while d in both_days:
                start = d
                current += 1
                d = d - timedelta(days=1)

        # Longest streak
        longest = 0
        run = 0
        prev = None
        for d in both_days:
            if prev and d == prev + timedelta(days=1):
                run += 1
            else:
                run = 1
            longest = max(longest, run)
            prev = d

        last_both = both_days[-1]
        return {
            "current_streak": current,
            "longest_streak": longest,
            "streak_started_at": start,
            "last_both_completed_date": last_both,
            "updated_at": datetime.utcnow(),
        }

    @staticmethod
    async def upsert_streaks(db, habit_id: str, partnership_id: str, data: Dict) -> None:
        await db.streaks.update_one(
            {"habit_id": ObjectId(habit_id)},
            {"$set": {
                "habit_id": ObjectId(habit_id),
                "partnership_id": ObjectId(partnership_id),
                "current_streak": data.get("current_streak", 0),
                "longest_streak": data.get("longest_streak", 0),
                "streak_started_at": data.get("streak_started_at"),
                "last_both_completed_date": data.get("last_both_completed_date"),
                "updated_at": data.get("updated_at", datetime.utcnow()),
            }},
            upsert=True,
        )

    @staticmethod
    def invalidate_mem_cache(habit_id: str) -> None:
        StreakCalculationService.streak_mem_cache.pop(habit_id, None)
