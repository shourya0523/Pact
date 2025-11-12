"""
Tests for Frequency Goals functionality.
"""

import pytest
from httpx import AsyncClient
from bson import ObjectId
from datetime import datetime, timedelta


# ============================================================================
# HELPER FIXTURES
# ============================================================================

@pytest.mark.asyncio
async def test_habit_with_partnership(test_db, test_partnership_id):
    """Create a test habit with a partnership."""
    habit_data = {
        "habit_name": "Test Habit",
        "partnership_id": test_partnership_id,
        "created_by": "testuser",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "goals": {}
    }
    result = await test_db.habits.insert_one(habit_data)
    return str(result.inserted_id)


# ============================================================================
# FREQUENCY GOAL CREATION TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_create_frequency_goal_daily(client: AsyncClient, auth_headers, test_db, test_user, test_partnership_id):
    """Test creating a daily frequency goal."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Meditate every day for 30 days",
        "frequency_count": 1,
        "frequency_unit": "day",
        "duration_count": 30,
        "duration_unit": "day"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["goal_type"] == "frequency"
    assert data["frequency_count"] == 1
    assert data["frequency_unit"] == "day"
    assert data["duration_count"] == 30
    assert data["duration_unit"] == "day"
    assert data["total_checkins_required"] == 30  # 1 * 30
    assert data["goal_progress"] == 0
    assert data["count_checkins"] == 0
    assert data["progress_percentage"] == 0.0
    assert data["is_completed"] is False


@pytest.mark.asyncio
async def test_create_frequency_goal_weekly(client: AsyncClient, auth_headers, test_db, test_user, test_partnership_id):
    """Test creating a weekly frequency goal."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Exercise 3 times per week for 12 weeks",
        "frequency_count": 3,
        "frequency_unit": "week",
        "duration_count": 12,
        "duration_unit": "week"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["frequency_count"] == 3
    assert data["frequency_unit"] == "week"
    assert data["total_checkins_required"] == 36  # 3 * 12


@pytest.mark.asyncio
async def test_create_frequency_goal_monthly(client: AsyncClient, auth_headers, test_db, test_user,
                                             test_partnership_id):
    """Test creating a monthly frequency goal."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Read 4 books per month for 6 months",
        "frequency_count": 4,
        "frequency_unit": "month",
        "duration_count": 6,
        "duration_unit": "month"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["frequency_count"] == 4
    assert data["frequency_unit"] == "month"
    assert data["total_checkins_required"] == 24  # 4 * 6


@pytest.mark.asyncio
async def test_create_frequency_goal_end_date_calculated(client: AsyncClient, auth_headers, test_db, test_user,
                                                         test_partnership_id):
    """Test that end date is automatically calculated."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Test Goal",
        "frequency_count": 2,
        "frequency_unit": "week",
        "duration_count": 4,
        "duration_unit": "week"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()

    # Verify end_date exists and is in the future
    assert data["goal_end_date"] is not None
    start_date = datetime.fromisoformat(data["goal_start_date"].replace('Z', '+00:00'))
    end_date = datetime.fromisoformat(data["goal_end_date"].replace('Z', '+00:00'))

    # End date should be approximately 4 weeks from start
    expected_delta = timedelta(weeks=4)
    actual_delta = end_date - start_date
    assert abs(actual_delta.total_seconds() - expected_delta.total_seconds()) < 3600  # Within 1 hour


# ============================================================================
# FREQUENCY GOAL VALIDATION TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_create_frequency_goal_missing_frequency_count(client: AsyncClient, auth_headers, test_db, test_user,
                                                             test_partnership_id):
    """Test that missing frequency_count is rejected."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Invalid Goal",
        "frequency_unit": "week",
        "duration_count": 4,
        "duration_unit": "week"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "frequency_count" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_frequency_goal_missing_frequency_unit(client: AsyncClient, auth_headers, test_db, test_user,
                                                            test_partnership_id):
    """Test that missing frequency_unit is rejected."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Invalid Goal",
        "frequency_count": 3,
        "duration_count": 4,
        "duration_unit": "week"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "frequency_unit" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_frequency_goal_mismatched_units(client: AsyncClient, auth_headers, test_db, test_user,
                                                      test_partnership_id):
    """Test that mismatched frequency and duration units are rejected."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Invalid Goal",
        "frequency_count": 3,
        "frequency_unit": "week",
        "duration_count": 30,
        "duration_unit": "day"  # Doesn't match frequency_unit
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "must match" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_frequency_goal_zero_frequency_count(client: AsyncClient, auth_headers, test_db, test_user,
                                                          test_partnership_id):
    """Test that zero frequency_count is rejected."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Invalid Goal",
        "frequency_count": 0,
        "frequency_unit": "week",
        "duration_count": 4,
        "duration_unit": "week"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 422  # Pydantic validation error


@pytest.mark.asyncio
async def test_create_frequency_goal_negative_duration(client: AsyncClient, auth_headers, test_db, test_user,
                                                       test_partnership_id):
    """Test that negative duration_count is rejected."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Invalid Goal",
        "frequency_count": 3,
        "frequency_unit": "week",
        "duration_count": -5,
        "duration_unit": "week"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 422  # Pydantic validation error


# ============================================================================
# FREQUENCY GOAL UPDATE TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_update_frequency_goal_name(client: AsyncClient, auth_headers, test_db, test_user, test_partnership_id):
    """Test updating frequency goal name."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # Create frequency goal
    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Old Name",
        "frequency_count": 3,
        "frequency_unit": "week",
        "duration_count": 4,
        "duration_unit": "week"
    }

    await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data,
        headers=auth_headers
    )

    # Update name
    response = await client.put(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json={"goal_name": "New Improved Name"},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["goal_name"] == "New Improved Name"
    # Verify frequency fields unchanged
    assert data["frequency_count"] == 3
    assert data["frequency_unit"] == "week"


@pytest.mark.asyncio
async def test_update_frequency_goal_end_date(client: AsyncClient, auth_headers, test_db, test_user,
                                              test_partnership_id):
    """Test updating frequency goal end date."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # Create goal
    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Test Goal",
        "frequency_count": 2,
        "frequency_unit": "week",
        "duration_count": 4,
        "duration_unit": "week"
    }

    await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data,
        headers=auth_headers
    )

    # Update end date
    new_end_date = (datetime.utcnow() + timedelta(weeks=8)).isoformat()
    response = await client.put(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json={"goal_end_date": new_end_date},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["goal_end_date"] is not None


@pytest.mark.asyncio
async def test_cannot_update_completion_goal_via_frequency_endpoint(client: AsyncClient, auth_headers, test_db,
                                                                    test_user, test_partnership_id):
    """Test that completion goals cannot be updated via frequency endpoint."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # Create completion goal
    goal_data = {
        "goal_type": "completion",
        "goal_name": "Complete Marathon"
    }

    await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json=goal_data,
        headers=auth_headers
    )

    # Try to update via frequency endpoint
    response = await client.put(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json={"goal_name": "New Name"},
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "only for frequency goals" in response.json()["detail"].lower()


# ============================================================================
# PROGRESS TRACKING TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_frequency_goal_progress_percentage(client: AsyncClient, auth_headers, test_db, test_user,
                                                  test_partnership_id):
    """Test that progress percentage is calculated correctly."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Test Goal",
        "frequency_count": 2,
        "frequency_unit": "week",
        "duration_count": 5,
        "duration_unit": "week"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()

    # Initial state
    assert data["count_checkins"] == 0
    assert data["total_checkins_required"] == 10  # 2 * 5
    assert data["progress_percentage"] == 0.0
    assert data["is_completed"] is False


@pytest.mark.asyncio
async def test_frequency_goal_total_checkins_required(client: AsyncClient, auth_headers, test_db, test_user,
                                                      test_partnership_id):
    """Test that total_checkins_required is calculated correctly for various configurations."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    test_cases = [
        (7, "day", 10, "day", 70),  # 7 per day for 10 days = 70
        (3, "week", 12, "week", 36),  # 3 per week for 12 weeks = 36
        (5, "month", 6, "month", 30),  # 5 per month for 6 months = 30
    ]

    for freq_count, freq_unit, dur_count, dur_unit, expected_total in test_cases:
        # Create new habit for each test case
        habit_data = {
            "habit_name": f"Test Habit {freq_count}{freq_unit}",
            "partnership_id": test_partnership_id,
            "created_by": "testuser",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "goals": {}
        }
        result = await test_db.habits.insert_one(habit_data)
        new_habit_id = str(result.inserted_id)

        goal_data = {
            "goal_type": "frequency",
            "goal_name": f"Test {freq_count}x {freq_unit}",
            "frequency_count": freq_count,
            "frequency_unit": freq_unit,
            "duration_count": dur_count,
            "duration_unit": dur_unit
        }

        response = await client.post(
            f"/api/goals/habits/{new_habit_id}/users/{str(test_user['_id'])}/goal/frequency",
            json=goal_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["total_checkins_required"] == expected_total, \
            f"Expected {expected_total} for {freq_count}x{freq_unit} for {dur_count}{dur_unit}"


# ============================================================================
# MULTIPLE USER FREQUENCY GOALS TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_different_frequency_goals_per_user(client: AsyncClient, auth_headers, second_auth_headers,
                                                  test_db, test_user, second_test_user, test_partnership_id):
    """Test that each user can have different frequency goals for the same habit."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # User 1: 3 times per week for 10 weeks
    goal_data_1 = {
        "goal_type": "frequency",
        "goal_name": "User 1 Goal",
        "frequency_count": 3,
        "frequency_unit": "week",
        "duration_count": 10,
        "duration_unit": "week"
    }

    response1 = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data_1,
        headers=auth_headers
    )

    # User 2: 5 times per week for 8 weeks
    goal_data_2 = {
        "goal_type": "frequency",
        "goal_name": "User 2 Goal",
        "frequency_count": 5,
        "frequency_unit": "week",
        "duration_count": 8,
        "duration_unit": "week"
    }

    response2 = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(second_test_user['_id'])}/goal/frequency",
        json=goal_data_2,
        headers=second_auth_headers
    )

    assert response1.status_code == 201
    assert response2.status_code == 201

    data1 = response1.json()
    data2 = response2.json()

    assert data1["total_checkins_required"] == 30  # 3 * 10
    assert data2["total_checkins_required"] == 40  # 5 * 8
    assert data1["frequency_count"] != data2["frequency_count"]


# ============================================================================
# EDGE CASES
# ============================================================================

@pytest.mark.asyncio
async def test_frequency_goal_with_very_large_numbers(client: AsyncClient, auth_headers, test_db, test_user,
                                                      test_partnership_id):
    """Test frequency goal with large but valid numbers."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Ambitious Year-Long Goal",
        "frequency_count": 365,
        "frequency_unit": "day",
        "duration_count": 365,
        "duration_unit": "day"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["total_checkins_required"] == 133225  # 365 * 365


@pytest.mark.asyncio
async def test_frequency_goal_minimal_values(client: AsyncClient, auth_headers, test_db, test_user,
                                             test_partnership_id):
    """Test frequency goal with minimal valid values."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Minimal Goal",
        "frequency_count": 1,
        "frequency_unit": "day",
        "duration_count": 1,
        "duration_unit": "day"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/frequency",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["total_checkins_required"] == 1