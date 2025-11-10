"""
Tests for Goals CRUD API endpoints.
"""

import pytest
from httpx import AsyncClient
from bson import ObjectId
from datetime import datetime


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


@pytest.mark.asyncio
async def test_habit_draft_creation(test_db, test_user):
    """Test creating a draft habit for a single user."""
    habit_data = {
        "habit_name": "Draft Habit",
        "created_by": str(test_user["_id"]),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "goals": {}
    }
    result = await test_db.habits.insert_one(habit_data)
    habit_id = str(result.inserted_id)

    # Add assertions to verify the draft was created correctly
    assert habit_id is not None
    habit = await test_db.habits.find_one({"_id": result.inserted_id})
    assert habit["habit_name"] == "Draft Habit"


# ============================================================================
# CREATE GOAL TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_create_frequency_goal_success(client: AsyncClient, auth_headers, test_db, test_user,
                                             test_partnership_id):
    """Test creating a frequency-based goal successfully."""
    # Create habit
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Exercise 3 times per week",
        "frequency_count": 3,
        "frequency_unit": "week",
        "duration_count": 4,
        "duration_unit": "week"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json=goal_data,
        headers=auth_headers
    )

    # Add debug output
    if response.status_code != 201:
        print(f"\n=== ERROR RESPONSE ===")
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.json()}")
        print(f"Goal Data Sent: {goal_data}")
        print(f"===================\n")

    assert response.status_code == 201
    data = response.json()
    assert data["goal_name"] == goal_data["goal_name"]
    assert data["goal_type"] == "frequency"
    assert data["frequency_count"] == 3
    assert data["frequency_unit"] == "week"
    assert data["goal_status"] == "active"
    assert data["goal_progress"] == 0
    assert data["is_completed"] is False


@pytest.mark.asyncio
async def test_create_completion_goal_success(client: AsyncClient, auth_headers, test_db, test_user,
                                              test_partnership_id):
    """Test creating a completion-based goal successfully."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "completion",
        "goal_name": "Complete 30 day challenge",

    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["goal_type"] == "completion"


@pytest.mark.asyncio
async def test_create_goal_invalid_habit_id(client: AsyncClient, auth_headers, test_user):
    """Test creating a goal with invalid habit ID format."""
    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Test Goal"
    }

    response = await client.post(
        f"/api/goals/habits/invalid_id/users/{str(test_user['_id'])}/goal",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "Invalid habit ID format" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_goal_habit_not_found(client: AsyncClient, auth_headers, test_user):
    """Test creating a goal for non-existent habit."""
    fake_habit_id = str(ObjectId())
    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Test Goal"
    }

    response = await client.post(
        f"/api/goals/habits/{fake_habit_id}/users/{str(test_user['_id'])}/goal",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 404
    assert "Habit not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_duplicate_goal(client: AsyncClient, auth_headers, test_db, test_user, test_partnership_id):
    """Test creating a duplicate goal for the same user/habit."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "First Goal",
        "frequency_count": 3,
        "frequency_unit": "week",
        "duration_count": 4,
        "duration_unit": "week"

    }

    # Create first goal
    response1 = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json=goal_data,
        headers=auth_headers
    )
    assert response1.status_code == 201

    # Try to create duplicate
    response2 = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json=goal_data,
        headers=auth_headers
    )

    assert response2.status_code == 400
    assert "already has a goal" in response2.json()["detail"]


@pytest.mark.asyncio
async def test_create_goal_unauthorized_access(client: AsyncClient, auth_headers, test_db, second_test_user):
    """Test creating a goal for a habit user doesn't have access to."""
    # Create habit for second user only
    habit_data = {
        "habit_name": "Other User Habit",
        "created_by": str(second_test_user["_id"]),
        "goals": {}
    }
    result = await test_db.habits.insert_one(habit_data)
    habit_id = str(result.inserted_id)

    goal_data = {
        "goal_type": "frequency",
        "goal_name": "Unauthorized Goal"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(second_test_user['_id'])}/goal",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 403


# ============================================================================
# CREATE COMPLETION GOAL ENDPOINT TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_create_completion_goal_via_endpoint_success(
    client: AsyncClient, 
    auth_headers, 
    test_db, 
    test_user,
    test_partnership_id
):
    """Test creating a completion goal via dedicated endpoint successfully."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "completion",
        "goal_name": "Complete 30 day leetcode"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/completion",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["goal_type"] == "completion"
    assert data["goal_name"] == "Complete 30 day leetcode"
    assert data["frequency_count"] is None
    assert data["frequency_unit"] is None
    assert data["duration_count"] is None
    assert data["duration_unit"] is None
    assert data["goal_status"] == "active"
    assert data["goal_progress"] == 0
    assert data["is_completed"] is False


@pytest.mark.asyncio
async def test_create_completion_goal_ignores_frequency_fields(
    client: AsyncClient, 
    auth_headers, 
    test_db, 
    test_user,
    test_partnership_id
):
    """Test that completion endpoint ignores frequency fields even if provided."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # User mistakenly includes frequency fields
    goal_data = {
        "goal_type": "completion",
        "goal_name": "Test completion goal",
        "frequency_count": 5,  # Should be ignored
        "frequency_unit": "week",  # Should be ignored
        "duration_count": 4,  # Should be ignored
        "duration_unit": "week"  # Should be ignored
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/completion",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["goal_type"] == "completion"
    # Verify all frequency fields are None
    assert data["frequency_count"] is None
    assert data["frequency_unit"] is None
    assert data["duration_count"] is None
    assert data["duration_unit"] is None


@pytest.mark.asyncio
async def test_create_completion_goal_minimal_data(
    client: AsyncClient, 
    auth_headers, 
    test_db, 
    test_user,
    test_partnership_id
):
    """Test creating completion goal with only required field (goal_name)."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "completion",
        "goal_name": "test minimal completion goal"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/completion",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["goal_name"] == "test minimal completion goal"
    assert data["goal_type"] == "completion"


@pytest.mark.asyncio
async def test_create_completion_goal_invalid_habit_id(
    client: AsyncClient, 
    auth_headers, 
    test_user
):
    """Test creating completion goal with invalid habit ID format."""
    goal_data = {
        "goal_type": "completion",
        "goal_name": "Complete challenge"
    }

    response = await client.post(
        f"/api/goals/habits/invalid_id/users/{str(test_user['_id'])}/goal/completion",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "Invalid habit ID format" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_completion_goal_habit_not_found(
    client: AsyncClient, 
    auth_headers, 
    test_user
):
    """Test creating completion goal for non-existent habit."""
    fake_habit_id = str(ObjectId())
    goal_data = {
        "goal_type": "completion",
        "goal_name": "Complete challenge"
    }

    response = await client.post(
        f"/api/goals/habits/{fake_habit_id}/users/{str(test_user['_id'])}/goal/completion",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 404
    assert "Habit not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_completion_goal_duplicate(
    client: AsyncClient, 
    auth_headers, 
    test_db, 
    test_user, 
    test_partnership_id
):
    """Test creating duplicate completion goal for same user/habit."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "completion",
        "goal_name": "Complete 30 days"
    }

    # Create first completion goal
    response1 = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/completion",
        json=goal_data,
        headers=auth_headers
    )
    assert response1.status_code == 201

    # Try to create duplicate
    response2 = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/completion",
        json=goal_data,
        headers=auth_headers
    )

    assert response2.status_code == 400
    assert "already has a goal" in response2.json()["detail"]


@pytest.mark.asyncio
async def test_create_completion_goal_unauthorized_access(
    client: AsyncClient, 
    auth_headers, 
    test_db, 
    second_test_user
):
    """Test creating completion goal for habit user doesn't have access to."""
    # Create habit for second user only
    habit_data = {
        "habit_name": "Private Habit",
        "created_by": str(second_test_user["_id"]),
        "goals": {}
    }
    result = await test_db.habits.insert_one(habit_data)
    habit_id = str(result.inserted_id)

    goal_data = {
        "goal_type": "completion",
        "goal_name": "Unauthorized completion"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(second_test_user['_id'])}/goal/completion",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_completion_goal_draft_habit(
    client: AsyncClient, 
    auth_headers, 
    test_db, 
    test_user
):
    """Test creating completion goal for draft habit (only creator)."""
    # Create draft habit
    habit_data = {
        "habit_name": "Draft Habit",
        "created_by": str(test_user["_id"]),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "goals": {}
    }
    result = await test_db.habits.insert_one(habit_data)
    habit_id = str(result.inserted_id)

    goal_data = {
        "goal_type": "completion",
        "goal_name": "Complete draft goal"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/completion",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["goal_type"] == "completion"


@pytest.mark.asyncio
async def test_create_completion_goal_wrong_user_draft_habit(
    client: AsyncClient, 
    auth_headers, 
    test_db, 
    test_user,
    second_test_user
):
    """Test creating completion goal for another user in draft habit (should fail)."""
    # Create draft habit for test_user
    habit_data = {
        "habit_name": "Draft Habit",
        "created_by": str(test_user["_id"]),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "goals": {}
    }
    result = await test_db.habits.insert_one(habit_data)
    habit_id = str(result.inserted_id)

    goal_data = {
        "goal_type": "completion",
        "goal_name": "Unauthorized goal"
    }

    # Try to create goal for second_test_user
    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(second_test_user['_id'])}/goal/completion",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 403
    assert "Can only set goals for yourself in draft habits" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_completion_goal_missing_goal_name(
    client: AsyncClient, 
    auth_headers, 
    test_db, 
    test_user,
    test_partnership_id
):
    """Test creating completion goal without required goal_name field."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {}  # Missing goal_name

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/completion",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_create_completion_goal_target_user_not_in_partnership(
    client: AsyncClient, 
    auth_headers, 
    test_db, 
    test_user,
    test_partnership_id
):
    """Test creating completion goal for user not in partnership."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)
    
    # Create a third user not in the partnership
    third_user = await test_db.users.insert_one({
        "email": "third@example.com",
        "username": "thirduser"
    })

    goal_data = {
        "goal_type": "completion",
        "goal_name": "Unauthorized user goal"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(third_user.inserted_id)}/goal/completion",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "not part of this habit's partnership" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_completion_goal_response_structure(
    client: AsyncClient, 
    auth_headers, 
    test_db, 
    test_user,
    test_partnership_id
):
    """Test that completion goal response has all expected fields."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    goal_data = {
        "goal_type": "completion",
        "goal_name": "Test completion structure"
    }

    response = await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/completion",
        json=goal_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    
    # Verify all expected fields are present
    expected_fields = [
        "user_id", "habit_id", "habit_name", "goal_type", "goal_name",
        "frequency_count", "frequency_unit", "duration_count", "duration_unit",
        "goal_progress", "count_checkins", "total_checkins_required",
        "progress_percentage", "is_completed", "checked_in", "goal_status",
        "goal_start_date", "goal_end_date", "created_at", "updated_at"
    ]
    
    for field in expected_fields:
        assert field in data

# ============================================================================
# READ GOAL TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_get_user_goal_success(client: AsyncClient, auth_headers, test_db, test_user, test_partnership_id):
    """Test retrieving a specific user's goal."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # Create goal first
    goal_data = {
        "goal_type": "frequency",
        "goal_name": "My Goal",
        "frequency_count": 5,
        "frequency_unit": "week",
        "duration_count": 4,
        "duration_unit": "week"
    }

    await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json=goal_data,
        headers=auth_headers
    )

    # Get goal
    response = await client.get(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["goal_name"] == "My Goal"
    assert data["frequency_count"] == 5


@pytest.mark.asyncio
async def test_get_user_goal_not_found(client: AsyncClient, auth_headers, test_db, test_user, test_partnership_id):
    """Test retrieving a non-existent goal."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    response = await client.get(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        headers=auth_headers
    )

    assert response.status_code == 404
    assert "Goal not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_habit_goals_empty(client: AsyncClient, auth_headers, test_db, test_partnership_id):
    """Test getting all goals for a habit with no goals."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    response = await client.get(
        f"/api/goals/habits/{habit_id}/goals",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_habit_goals_multiple(client: AsyncClient, auth_headers, second_auth_headers, test_db, test_user,
                                        second_test_user, test_partnership_id):
    """Test getting all goals for a habit with multiple users."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # Create goal for first user
    goal_data_1 = {
        "goal_type": "frequency",
        "goal_name": "User 1 Goal",
        "frequency_count": 3,
        "frequency_unit": "week",
        "duration_count": 4,
        "duration_unit": "week"

    }
    await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json=goal_data_1,
        headers=auth_headers
    )

    # Create goal for second user
    goal_data_2 = {
        "goal_type": "completion",
        "goal_name": "User 2 Goal"
    }
    await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(second_test_user['_id'])}/goal",
        json=goal_data_2,
        headers=second_auth_headers
    )

    # Get all goals
    response = await client.get(
        f"/api/goals/habits/{habit_id}/goals",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    goal_names = [g["goal_name"] for g in data]
    assert "User 1 Goal" in goal_names
    assert "User 2 Goal" in goal_names


@pytest.mark.asyncio
async def test_get_my_goals_active_only(client: AsyncClient, auth_headers, test_db, test_user, test_partnership_id):
    """Test filtering for active goals only."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # Create goal with all required frequency fields
    await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json={
            "goal_type": "frequency",
            "goal_name": "Active Goal",
            "frequency_count": 3,
            "frequency_unit": "week",
            "duration_count": 4,
            "duration_unit": "week"
        },
        headers=auth_headers
    )

    # Mark as completed
    await client.patch(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/status",
        params={"new_status": "completed"},
        headers=auth_headers
    )

    # Get active only
    response = await client.get(
        "/api/goals/users/me/goals?active_only=true",
        headers=auth_headers
    )

    assert response.status_code == 200
    assert len(response.json()) == 0



# ============================================================================
# UPDATE GOAL TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_update_goal_name(client: AsyncClient, auth_headers, test_db, test_user, test_partnership_id):
    """Test updating goal name."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # Create goal with completion type (simpler, no frequency fields needed)
    await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json={
            "goal_type": "completion",
            "goal_name": "Old Name"
        },
        headers=auth_headers
    )

    # Update goal
    response = await client.put(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json={"goal_name": "New Name"},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["goal_name"] == "New Name"

@pytest.mark.asyncio
async def test_update_goal_end_date(client: AsyncClient, auth_headers, test_db, test_user, test_partnership_id):
    """Test updating goal end date."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # Create goal
    await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json={
            "goal_type": "completion",
            "goal_name": "Old Name"
        },
        headers=auth_headers
    )

    # Update end date
    new_end_date = "2025-12-31T00:00:00"
    response = await client.put(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json={"goal_end_date": new_end_date},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["goal_end_date"] is not None


@pytest.mark.asyncio
async def test_update_goal_unauthorized(client: AsyncClient, auth_headers, test_db, test_user, second_test_user,
                                        test_partnership_id):
    """Test updating another user's goal (should fail)."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # Create goal for second user
    await test_db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {"$set": {f"goals.{str(second_test_user['_id'])}": {
            "goal_type": "frequency",
            "goal_name": "Other User Goal",
            "goal_status": "active"
        }}}
    )

    # Try to update as first user
    response = await client.put(
        f"/api/goals/habits/{habit_id}/users/{str(second_test_user['_id'])}/goal",
        json={"goal_name": "Hacked Name"},
        headers=auth_headers
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_nonexistent_goal(client: AsyncClient, auth_headers, test_db, test_user, test_partnership_id):
    """Test updating a goal that doesn't exist."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    response = await client.put(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json={"goal_name": "New Name"},
        headers=auth_headers
    )

    assert response.status_code == 404

# ============================================================================
# DELETE GOAL TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_delete_goal_success(client: AsyncClient, auth_headers, test_db, test_user, test_partnership_id):
    """Test deleting a goal successfully."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # Create goal
    await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json={
            "goal_type": "completion",
            "goal_name": "Old Name"
        },
        headers=auth_headers
    )

    # Delete goal
    response = await client.delete(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        headers=auth_headers
    )

    assert response.status_code == 204

    # Verify deletion
    get_response = await client.get(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        headers=auth_headers
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_delete_goal_unauthorized(client: AsyncClient, auth_headers, test_db, second_test_user,
                                        test_partnership_id):
    """Test deleting another user's goal (should fail)."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # Create goal for second user
    await test_db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {"$set": {f"goals.{str(second_test_user['_id'])}": {
            "goal_type": "frequency",
            "goal_name": "Protected Goal",
            "goal_status": "active"
        }}}
    )

    # Try to delete as first user
    response = await client.delete(
        f"/api/goals/habits/{habit_id}/users/{str(second_test_user['_id'])}/goal",
        headers=auth_headers
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_nonexistent_goal(client: AsyncClient, auth_headers, test_db, test_user, test_partnership_id):
    """Test deleting a goal that doesn't exist."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    response = await client.delete(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        headers=auth_headers
    )

    assert response.status_code == 404


# ============================================================================
# GOAL STATUS TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_update_goal_status_to_completed(client: AsyncClient, auth_headers, test_db, test_user,
                                               test_partnership_id):
    """Test updating goal status to completed."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # Create goal
    await client.post(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal",
        json={
            "goal_type": "completion",
            "goal_name": "Old Name"
        },
        headers=auth_headers
    )

    # Update status
    response = await client.patch(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/status",
        params={"new_status": "completed"},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["goal_status"] == "completed"


@pytest.mark.asyncio
async def test_update_goal_status_unauthorized(client: AsyncClient, auth_headers, test_db, second_test_user,
                                               test_partnership_id):
    """Test updating another user's goal status (should fail)."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    # Create goal for second user
    await test_db.habits.update_one(
        {"_id": ObjectId(habit_id)},
        {"$set": {f"goals.{str(second_test_user['_id'])}": {
            "goal_type": "frequency",
            "goal_name": "Other Goal",
            "goal_status": "active"
        }}}
    )

    # Try to update status
    response = await client.patch(
        f"/api/goals/habits/{habit_id}/users/{str(second_test_user['_id'])}/goal/status",
        params={"new_status": "completed"},
        headers=auth_headers
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_status_nonexistent_goal(client: AsyncClient, auth_headers, test_db, test_user,
                                              test_partnership_id):
    """Test updating status of a non-existent goal."""
    habit_id = await test_habit_with_partnership(test_db, test_partnership_id)

    response = await client.patch(
        f"/api/goals/habits/{habit_id}/users/{str(test_user['_id'])}/goal/status",
        params={"new_status": "completed"},
        headers=auth_headers
    )

    assert response.status_code == 404
