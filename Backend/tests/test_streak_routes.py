"""
Route tests for Streaks API endpoints.

Covers:
- 401/403 when missing auth
- 404 when habit not found
- 403 when user not in partnership
- 200 success with computed streak fields
"""

import pytest
from datetime import datetime, timedelta, date
from bson import ObjectId


@pytest.mark.asyncio
async def test_get_habit_streak_unauthorized_returns_403(client):
    # Missing Authorization header → FastAPI HTTPBearer returns 403
    habit_id = str(ObjectId())
    resp = await client.get(f"/streaks/habit/{habit_id}")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_habit_streak_habit_not_found_returns_404(client, auth_headers):
    # Valid auth, but habit id does not exist → 404
    non_existent_habit_id = str(ObjectId())
    resp = await client.get(f"/streaks/habit/{non_existent_habit_id}", headers=auth_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_habit_streak_forbidden_when_user_not_in_partnership(client, test_db, second_auth_headers):
    # Create a partnership between two OTHER users
    user_a = await test_db.users.insert_one({
        "username": "other1",
        "email": "o1@example.com",
        "password": "x",
        "created_at": datetime.utcnow(),
    })
    user_b = await test_db.users.insert_one({
        "username": "other2",
        "email": "o2@example.com",
        "password": "x",
        "created_at": datetime.utcnow(),
    })
    partnership = await test_db.partnerships.insert_one({
        "user_id_1": str(user_a.inserted_id),
        "user_id_2": str(user_b.inserted_id),
        "status": "active",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })

    # Create a habit under that partnership
    habit = await test_db.habits.insert_one({
        "habit_name": "Run",
        "habit_type": "build",
        "category": "fitness",
        "partnership_id": str(partnership.inserted_id),
        "created_by": str(user_a.inserted_id),
        "status": "active",
        "created_at": datetime.utcnow(),
    })

    # second_auth_headers belongs to second_test_user, not in this partnership → 403
    resp = await client.get(f"/streaks/habit/{str(habit.inserted_id)}", headers=second_auth_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_habit_streak_success_200(client, test_db, auth_headers, test_partnership_id, test_user, second_test_user):
    # Create habit under the test partnership (which includes test_user and second_test_user)
    habit = await test_db.habits.insert_one({
        "habit_name": "Morning Run",
        "habit_type": "build",
        "category": "fitness",
        "partnership_id": test_partnership_id,
        "created_by": str(test_user["_id"]),
        "status": "active",
        "created_at": datetime.utcnow(),
    })

    # Seed logs: BOTH completed today and yesterday → current_streak should be 2
    today = date.today()
    yesterday = today - timedelta(days=1)
    await test_db.habit_logs.insert_many([
        {"habit_id": str(habit.inserted_id), "user_id": str(test_user["_id"]), "date": today, "completed": True, "logged_at": datetime.utcnow()},
        {"habit_id": str(habit.inserted_id), "user_id": str(second_test_user["_id"]), "date": today, "completed": True, "logged_at": datetime.utcnow()},
        {"habit_id": str(habit.inserted_id), "user_id": str(test_user["_id"]), "date": yesterday, "completed": True, "logged_at": datetime.utcnow()},
        {"habit_id": str(habit.inserted_id), "user_id": str(second_test_user["_id"]), "date": yesterday, "completed": True, "logged_at": datetime.utcnow()},
    ])

    # Call route
    resp = await client.get(f"/streaks/habit/{str(habit.inserted_id)}", headers=auth_headers)
    assert resp.status_code == 200

    body = resp.json()
    # Minimal shape assertions
    assert set(["current_streak", "longest_streak", "streak_start_date", "last_completed_date", "is_on_track"]).issubset(body.keys())
    assert body["current_streak"] >= 1
    # On a fresh DB with only these logs, longest equals current
    assert body["current_streak"] == body["longest_streak"] == 2
    # is_on_track should be True if both completed today
    assert body["is_on_track"] is True


