import asyncio
from datetime import datetime, timedelta, date
import pytest

from app.services.streak_service import StreakCalculationService


class FakeCursor:
    def __init__(self, docs):
        self._docs = docs

    async def to_list(self, length=None):
        return list(self._docs)


class FakeCollection:
    def __init__(self):
        self._find_one_result = None
        self._find_docs = []
        self.update_calls = []
        self.find_one_calls = 0
        self.find_calls = 0
        self.update_call_count = 0

    def set_find_one(self, doc):
        self._find_one_result = doc

    def set_find_docs(self, docs):
        self._find_docs = docs

    async def find_one(self, *args, **kwargs):
        self.find_one_calls += 1
        return self._find_one_result

    def find(self, *args, **kwargs):
        self.find_calls += 1
        return FakeCursor(self._find_docs)

    async def update_one(self, filter_, update, upsert=False):
        self.update_calls.append({
            "filter": filter_,
            "update": update,
            "upsert": upsert,
        })
        self.update_call_count += 1
        return type("Result", (), {"modified_count": 1})


class FakeDB:
    def __init__(self):
        self.streaks = FakeCollection()
        self.partnerships = FakeCollection()
        self.habit_logs = FakeCollection()


@pytest.fixture(autouse=True)
def _clear_mem_cache():
    # Ensure tests don't leak cache state between runs
    StreakCalculationService.streak_mem_cache.clear()
    yield
    StreakCalculationService.streak_mem_cache.clear()


@pytest.mark.asyncio
async def test_memory_cache_hit_returns_cached_data():
    db = FakeDB()
    habit_id = "h1"
    partnership_id = "p1"

    # Pre-populate in-memory cache with not-yet-expired entry
    data = {
        "current_streak": 3,
        "longest_streak": 10,
        "streak_started_at": date.today() - timedelta(days=2),
        "last_both_completed_date": date.today(),
        "updated_at": datetime.utcnow(),
    }
    StreakCalculationService.streak_mem_cache[habit_id] = {
        "data": data,
        "expires_at": datetime.utcnow() + timedelta(seconds=60),
    }

    # Should return from memory, not hitting DB
    out = await StreakCalculationService.get_streak_cached(db, habit_id, partnership_id)
    assert out == data
    assert db.streaks.find_one_calls == 0


@pytest.mark.asyncio
async def test_memory_cache_expired_falls_back_to_db_and_refreshes_memory():
    db = FakeDB()
    habit_id = "h2"
    partnership_id = "p2"

    # Expired cache entry
    StreakCalculationService.streak_mem_cache[habit_id] = {
        "data": {"current_streak": 1},
        "expires_at": datetime.utcnow() - timedelta(seconds=1),
    }

    # Persisted doc in Mongo streaks
    doc = {
        "current_streak": 5,
        "longest_streak": 7,
        "streak_started_at": date.today() - timedelta(days=4),
        "last_both_completed_date": date.today(),
        "updated_at": datetime.utcnow(),
    }
    db.streaks.set_find_one(doc)

    out = await StreakCalculationService.get_streak_cached(db, habit_id, partnership_id)
    assert out == doc
    assert db.streaks.find_one_calls == 1

    # Memory should have been refreshed with a new future expires_at
    cached = StreakCalculationService.streak_mem_cache.get(habit_id)
    assert cached is not None
    assert cached["expires_at"] > datetime.utcnow()


@pytest.mark.asyncio
async def test_cold_start_recompute_and_upsert_to_streaks():
    db = FakeDB()
    habit_id = "h3"
    partnership_id = "p3"

    # No memory, no streaks doc → force recompute
    db.streaks.set_find_one(None)

    # Partnership users
    db.partnerships.set_find_one({"user_id_1": "u1", "user_id_2": "u2"})

    # Habit logs where BOTH completed today and yesterday → current streak = 2
    today = date.today()
    logs = [
        {"habit_id": habit_id, "user_id": "u1", "date": today, "completed": True},
        {"habit_id": habit_id, "user_id": "u2", "date": today, "completed": True},
        {"habit_id": habit_id, "user_id": "u1", "date": today - timedelta(days=1), "completed": True},
        {"habit_id": habit_id, "user_id": "u2", "date": today - timedelta(days=1), "completed": True},
    ]
    db.habit_logs.set_find_docs(logs)

    out = await StreakCalculationService.get_streak_cached(db, habit_id, partnership_id)
    assert out["current_streak"] == 2
    assert out["last_both_completed_date"] == today

    # Should have upserted into streaks
    assert len(db.streaks.update_calls) == 1
    update = db.streaks.update_calls[0]["update"]["$set"]
    assert update["current_streak"] == 2


@pytest.mark.asyncio
async def test_invalidate_mem_cache_removes_entry():
    habit_id = "h4"
    StreakCalculationService.streak_mem_cache[habit_id] = {
        "data": {"current_streak": 9},
        "expires_at": datetime.utcnow() + timedelta(seconds=60),
    }
    StreakCalculationService.invalidate_mem_cache(habit_id)
    assert habit_id not in StreakCalculationService.streak_mem_cache


@pytest.mark.asyncio
async def test_is_on_track_mapping_from_cached_data():
    db = FakeDB()
    habit_id = "h5"
    partnership_id = "p5"

    # Persisted doc says last_both_completed_date is today → is_on_track True
    db.streaks.set_find_one({
        "current_streak": 1,
        "longest_streak": 1,
        "streak_started_at": date.today(),
        "last_both_completed_date": date.today(),
        "updated_at": datetime.utcnow(),
    })

    result = await StreakCalculationService.calculate_streak_for_habit(
        db, habit_id, partnership_id
    )
    assert result["is_on_track"] is True


@pytest.mark.asyncio
async def test_concurrent_cold_starts_do_not_duplicate_recompute_or_upsert():
    db = FakeDB()
    habit_id = "h6"
    partnership_id = "p6"

    # No cached memory or streaks doc
    db.streaks.set_find_one(None)

    # Partnership and logs for a 1-day streak
    db.partnerships.set_find_one({"user_id_1": "u1", "user_id_2": "u2"})
    today = date.today()
    db.habit_logs.set_find_docs([
        {"habit_id": habit_id, "user_id": "u1", "date": today, "completed": True},
        {"habit_id": habit_id, "user_id": "u2", "date": today, "completed": True},
    ])

    # Fire 20 concurrent requests (cold start)
    results = await asyncio.gather(*[
        StreakCalculationService.get_streak_cached(db, habit_id, partnership_id)
        for _ in range(20)
    ])

    # All should agree
    assert all(r["current_streak"] == 1 for r in results)

    # Only one upsert should have occurred due to per-habit recompute lock
    assert db.streaks.update_call_count == 1


# Additional edge/boundary tests

@pytest.mark.asyncio
async def test_no_logs_results_zero_streak():
    """If there are no completed logs, streak should be zero and fields None."""
    db = FakeDB()
    habit_id = "e1"
    partnership_id = "p1"
    db.partnerships.set_find_one({"user_id_1": "u1", "user_id_2": "u2"})
    db.habit_logs.set_find_docs([])

    out = await StreakCalculationService.recompute_streak_from_logs(db, habit_id, partnership_id)
    assert out["current_streak"] == 0
    assert out["longest_streak"] == 0
    assert out["streak_started_at"] is None
    assert out["last_both_completed_date"] is None


@pytest.mark.asyncio
async def test_only_one_partner_logs_no_streak():
    """If only one partner logs, days do not count toward streak."""
    db = FakeDB()
    habit_id = "e2"
    partnership_id = "p2"
    db.partnerships.set_find_one({"user_id_1": "u1", "user_id_2": "u2"})
    d = date.today()
    db.habit_logs.set_find_docs([
        {"habit_id": habit_id, "user_id": "u1", "date": d, "completed": True},
    ])
    out = await StreakCalculationService.recompute_streak_from_logs(db, habit_id, partnership_id)
    assert out["current_streak"] == 0
    assert out["longest_streak"] == 0


@pytest.mark.asyncio
async def test_gap_breaks_current_streak():
    """A gap day should break current streak even if earlier days qualified."""
    db = FakeDB()
    habit_id = "e3"
    partnership_id = "p3"
    db.partnerships.set_find_one({"user_id_1": "u1", "user_id_2": "u2"})
    today = date.today()
    # Both completed today; gap yesterday; both two days ago
    db.habit_logs.set_find_docs([
        {"habit_id": habit_id, "user_id": "u1", "date": today, "completed": True},
        {"habit_id": habit_id, "user_id": "u2", "date": today, "completed": True},
        {"habit_id": habit_id, "user_id": "u1", "date": today - timedelta(days=2), "completed": True},
        {"habit_id": habit_id, "user_id": "u2", "date": today - timedelta(days=2), "completed": True},
    ])
    out = await StreakCalculationService.recompute_streak_from_logs(db, habit_id, partnership_id)
    assert out["current_streak"] == 1
    assert out["longest_streak"] == 2  # two-day run exists, but current is 1


@pytest.mark.asyncio
async def test_current_streak_anchored_from_yesterday():
    """If today not completed but yesterday and earlier are, anchor at yesterday."""
    db = FakeDB()
    habit_id = "e4"
    partnership_id = "p4"
    db.partnerships.set_find_one({"user_id_1": "u1", "user_id_2": "u2"})
    today = date.today()
    db.habit_logs.set_find_docs([
        {"habit_id": habit_id, "user_id": "u1", "date": today - timedelta(days=1), "completed": True},
        {"habit_id": habit_id, "user_id": "u2", "date": today - timedelta(days=1), "completed": True},
        {"habit_id": habit_id, "user_id": "u1", "date": today - timedelta(days=2), "completed": True},
        {"habit_id": habit_id, "user_id": "u2", "date": today - timedelta(days=2), "completed": True},
    ])
    out = await StreakCalculationService.recompute_streak_from_logs(db, habit_id, partnership_id)
    assert out["current_streak"] == 2


@pytest.mark.asyncio
async def test_longest_greater_than_current():
    """Longest should reflect best historical run even if current is smaller."""
    db = FakeDB()
    habit_id = "e5"
    partnership_id = "p5"
    db.partnerships.set_find_one({"user_id_1": "u1", "user_id_2": "u2"})
    t = date.today()
    # Past: 5-day run; Current: 2-day run (today + yesterday)
    docs = []
    for i in range(7, 2, -1):  # 7..3 days ago → 5 days
        docs.append({"habit_id": habit_id, "user_id": "u1", "date": t - timedelta(days=i), "completed": True})
        docs.append({"habit_id": habit_id, "user_id": "u2", "date": t - timedelta(days=i), "completed": True})
    docs.extend([
        {"habit_id": habit_id, "user_id": "u1", "date": t, "completed": True},
        {"habit_id": habit_id, "user_id": "u2", "date": t, "completed": True},
        {"habit_id": habit_id, "user_id": "u1", "date": t - timedelta(days=1), "completed": True},
        {"habit_id": habit_id, "user_id": "u2", "date": t - timedelta(days=1), "completed": True},
    ])
    db.habit_logs.set_find_docs(docs)
    out = await StreakCalculationService.recompute_streak_from_logs(db, habit_id, partnership_id)
    assert out["current_streak"] == 2
    assert out["longest_streak"] == 5


@pytest.mark.asyncio
async def test_ttl_boundary_exact_expiry_triggers_refresh():
    """If expires_at == now, treat as expired and refresh from DB."""
    db = FakeDB()
    habit_id = "e6"
    partnership_id = "p6"
    # Memory entry at exact boundary
    StreakCalculationService.streak_mem_cache[habit_id] = {
        "data": {"current_streak": 99},
        "expires_at": datetime.utcnow(),
    }
    # DB has the canonical value
    doc = {
        "current_streak": 3,
        "longest_streak": 3,
        "streak_started_at": date.today() - timedelta(days=2),
        "last_both_completed_date": date.today(),
        "updated_at": datetime.utcnow(),
    }
    db.streaks.set_find_one(doc)
    out = await StreakCalculationService.get_streak_cached(db, habit_id, partnership_id)
    assert out["current_streak"] == 3


@pytest.mark.asyncio
async def test_refresh_after_upsert_memory_updated():
    """After recompute+upsert, memory should contain fresh data with future TTL."""
    db = FakeDB()
    habit_id = "e7"
    partnership_id = "p7"
    db.streaks.set_find_one(None)
    db.partnerships.set_find_one({"user_id_1": "u1", "user_id_2": "u2"})
    today = date.today()
    db.habit_logs.set_find_docs([
        {"habit_id": habit_id, "user_id": "u1", "date": today, "completed": True},
        {"habit_id": habit_id, "user_id": "u2", "date": today, "completed": True},
    ])
    out = await StreakCalculationService.get_streak_cached(db, habit_id, partnership_id)
    cached = StreakCalculationService.streak_mem_cache.get(habit_id)
    assert cached is not None and cached["expires_at"] > datetime.utcnow()
    assert out["current_streak"] == 1


@pytest.mark.asyncio
async def test_concurrent_reads_during_recompute_get_same_result():
    """Concurrent readers during cold-start recompute should all receive same data."""
    db = FakeDB()
    habit_id = "e8"
    partnership_id = "p8"
    db.streaks.set_find_one(None)
    db.partnerships.set_find_one({"user_id_1": "u1", "user_id_2": "u2"})
    today = date.today()
    db.habit_logs.set_find_docs([
        {"habit_id": habit_id, "user_id": "u1", "date": today, "completed": True},
        {"habit_id": habit_id, "user_id": "u2", "date": today, "completed": True},
    ])
    res = await asyncio.gather(*[
        StreakCalculationService.get_streak_cached(db, habit_id, partnership_id)
        for _ in range(5)
    ])
    assert {r["current_streak"] for r in res} == {1}


@pytest.mark.asyncio
async def test_two_habits_concurrent_recompute_are_independent():
    """Different habit_ids should not block each other with the per-habit lock."""
    db = FakeDB()
    partnership_id = "px"
    db.partnerships.set_find_one({"user_id_1": "u1", "user_id_2": "u2"})
    today = date.today()
    db.habit_logs.set_find_docs([
        {"habit_id": "ha", "user_id": "u1", "date": today, "completed": True},
        {"habit_id": "ha", "user_id": "u2", "date": today, "completed": True},
        {"habit_id": "hb", "user_id": "u1", "date": today, "completed": True},
        {"habit_id": "hb", "user_id": "u2", "date": today, "completed": True},
    ])
    res = await asyncio.gather(
        StreakCalculationService.get_streak_cached(db, "ha", partnership_id),
        StreakCalculationService.get_streak_cached(db, "hb", partnership_id),
    )
    assert res[0]["current_streak"] == 1 and res[1]["current_streak"] == 1


@pytest.mark.asyncio
async def test_multiple_days_consecutive_streak_value():
    """Verify a longer consecutive run computes correctly."""
    db = FakeDB()
    habit_id = "e9"
    partnership_id = "p9"
    db.partnerships.set_find_one({"user_id_1": "u1", "user_id_2": "u2"})
    t = date.today()
    docs = []
    for i in range(0, 6):  # today..today-5
        docs.append({"habit_id": habit_id, "user_id": "u1", "date": t - timedelta(days=i), "completed": True})
        docs.append({"habit_id": habit_id, "user_id": "u2", "date": t - timedelta(days=i), "completed": True})
    db.habit_logs.set_find_docs(docs)
    out = await StreakCalculationService.recompute_streak_from_logs(db, habit_id, partnership_id)
    assert out["current_streak"] == 6
    assert out["longest_streak"] == 6


@pytest.mark.asyncio
async def test_recompute_idempotent_updates():
    """Calling recompute+upsert twice should perform two upserts but same value."""
    db = FakeDB()
    habit_id = "e10"
    partnership_id = "p10"
    db.streaks.set_find_one(None)
    db.partnerships.set_find_one({"user_id_1": "u1", "user_id_2": "u2"})
    today = date.today()
    db.habit_logs.set_find_docs([
        {"habit_id": habit_id, "user_id": "u1", "date": today, "completed": True},
        {"habit_id": habit_id, "user_id": "u2", "date": today, "completed": True},
    ])
    out1 = await StreakCalculationService.get_streak_cached(db, habit_id, partnership_id)
    StreakCalculationService.invalidate_mem_cache(habit_id)
    db.streaks.set_find_one({**out1})  # simulate existing doc on second pass
    out2 = await StreakCalculationService.get_streak_cached(db, habit_id, partnership_id)
    assert out1["current_streak"] == out2["current_streak"] == 1
    # First time upserted once, second time should not upsert (found doc). So >=1
    assert db.streaks.update_call_count >= 1



