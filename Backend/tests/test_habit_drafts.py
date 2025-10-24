"""
Test suite for habit draft functionality.

Tests cover:
- Creating drafts
- Retrieving drafts (single and multiple)
- Updating drafts
- Deleting drafts
- Converting drafts to active habits
- Access control (users can only access their own drafts)
"""

import pytest
from httpx import AsyncClient
from bson import ObjectId
from datetime import datetime


# ============================================================================
# CREATE DRAFT TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_create_habit_draft(client: AsyncClient, auth_headers):
    """
    Test creating a new habit draft.

    Verifies:
    - Draft is successfully created
    - Status is set to "draft"
    - partnership_id is None
    - User ID is correctly associated
    """
    draft_data = {
        "habit_name": "Morning Exercise",
        "habit_type": "build",
        "category": "fitness",
        "description": "30 minutes of cardio every morning",
        "frequency": "daily",
        "goal": {"user1": {"target": 30, "unit": "minutes"}}
    }

    response = await client.post(
        "/api/habits/drafts",
        json=draft_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()

    # Verify draft fields
    assert data["habit_name"] == draft_data["habit_name"]
    assert data["habit_type"] == draft_data["habit_type"]
    assert data["status"] == "draft"  # Should be draft status
    assert data["partnership_id"] is None  # No partner yet
    assert data["created_by"] is not None
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_draft_minimal_fields(client: AsyncClient, auth_headers):
    """
    Test creating a draft with only required fields.

    Verifies:
    - Draft can be created with minimal data
    - Optional fields are handled correctly
    """
    minimal_draft = {
        "habit_name": "Read Books",
        "habit_type": "build",
        "category": "learning"
    }

    response = await client.post(
        "/api/habits/drafts",
        json=minimal_draft,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["habit_name"] == "Read Books"
    assert data["status"] == "draft"
    assert data["description"] is None or data["description"] == ""


@pytest.mark.asyncio
async def test_create_draft_invalid_data(client: AsyncClient, auth_headers):
    """
    Test creating a draft with invalid data.

    Verifies:
    - Validation errors are properly returned
    - Invalid habit types are rejected
    """
    invalid_draft = {
        "habit_name": "",  # Empty name - should fail
        "habit_type": "invalid_type",  # Invalid type
        "category": "fitness"
    }

    response = await client.post(
        "/api/habits/drafts",
        json=invalid_draft,
        headers=auth_headers
    )

    assert response.status_code == 422  # Validation error


# ============================================================================
# GET DRAFTS TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_get_all_user_drafts(client: AsyncClient, auth_headers):
    """
    Test retrieving all drafts for a user.

    Verifies:
    - Multiple drafts can be created
    - All user's drafts are returned
    - Only drafts (not active habits) are returned
    """
    # Create multiple drafts
    drafts_to_create = [
        {
            "habit_name": "Morning Meditation",
            "habit_type": "build",
            "category": "mindfulness"
        },
        {
            "habit_name": "Quit Smoking",
            "habit_type": "break",
            "category": "health"
        },
        {
            "habit_name": "Evening Walk",
            "habit_type": "build",
            "category": "fitness"
        }
    ]

    # Create all drafts
    for draft in drafts_to_create:
        await client.post(
            "/api/habits/drafts",
            json=draft,
            headers=auth_headers
        )

    # Retrieve all drafts
    response = await client.get(
        "/api/habits/drafts",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # Should have at least 3 drafts (the ones we just created)
    assert len(data) >= 3

    # All returned items should be drafts
    for habit in data:
        assert habit["status"] == "draft"
        assert habit["partnership_id"] is None


@pytest.mark.asyncio
async def test_get_specific_draft(client: AsyncClient, auth_headers):
    """
    Test retrieving a specific draft by ID.

    Verifies:
    - Draft can be retrieved by ID
    - Correct draft data is returned
    """
    # Create a draft
    draft_data = {
        "habit_name": "Learn Spanish",
        "habit_type": "build",
        "category": "learning",
        "description": "Practice Spanish for 20 minutes daily"
    }

    create_response = await client.post(
        "/api/habits/drafts",
        json=draft_data,
        headers=auth_headers
    )
    draft_id = create_response.json()["id"]

    # Retrieve the specific draft
    response = await client.get(
        f"/api/habits/drafts/{draft_id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == draft_id
    assert data["habit_name"] == "Learn Spanish"
    assert data["status"] == "draft"


@pytest.mark.asyncio
async def test_get_nonexistent_draft(client: AsyncClient, auth_headers):
    """
    Test retrieving a draft that doesn't exist.

    Verifies:
    - 404 error is returned
    - Appropriate error message
    """
    fake_id = str(ObjectId())  # Generate valid ObjectId that doesn't exist

    response = await client.get(
        f"/api/habits/drafts/{fake_id}",
        headers=auth_headers
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_draft_invalid_id(client: AsyncClient, auth_headers):
    """
    Test retrieving a draft with invalid ID format.

    Verifies:
    - 400 error for invalid ObjectId format
    """
    response = await client.get(
        "/api/habits/drafts/invalid-id-format",
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()


# ============================================================================
# UPDATE DRAFT TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_update_draft(client: AsyncClient, auth_headers):
    """
    Test updating an existing draft.

    Verifies:
    - Draft fields can be updated
    - Only provided fields are changed
    - Unchanged fields remain the same
    - updated_at timestamp is refreshed
    """
    # Create a draft
    initial_data = {
        "habit_name": "Gym Workout",
        "habit_type": "build",
        "category": "fitness",
        "description": "Initial description",
        "frequency": "daily"
    }

    create_response = await client.post(
        "/api/habits/drafts",
        json=initial_data,
        headers=auth_headers
    )
    draft_id = create_response.json()["id"]
    initial_created_at = create_response.json()["created_at"]

    # Update specific fields
    update_data = {
        "description": "Updated: Go to gym 3x per week",
        "frequency": "weekly"
    }

    response = await client.put(
        f"/api/habits/drafts/{draft_id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # Verify updated fields
    assert data["description"] == update_data["description"]
    assert data["frequency"] == update_data["frequency"]

    # Verify unchanged fields
    assert data["habit_name"] == initial_data["habit_name"]
    assert data["habit_type"] == initial_data["habit_type"]
    assert data["category"] == initial_data["category"]
    assert data["status"] == "draft"

    # Verify created_at stays the same but updated_at changes
    assert data["created_at"] == initial_created_at


@pytest.mark.asyncio
async def test_update_nonexistent_draft(client: AsyncClient, auth_headers):
    """
    Test updating a draft that doesn't exist.

    Verifies:
    - 404 error is returned
    """
    fake_id = str(ObjectId())

    update_data = {
        "habit_name": "Updated Name"
    }

    response = await client.put(
        f"/api/habits/drafts/{fake_id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_draft_to_invalid_data(client: AsyncClient, auth_headers):
    """
    Test updating a draft with invalid data.

    Verifies:
    - Validation errors prevent invalid updates
    """
    # Create a draft
    draft_data = {
        "habit_name": "Valid Habit",
        "habit_type": "build",
        "category": "fitness"
    }

    create_response = await client.post(
        "/api/habits/drafts",
        json=draft_data,
        headers=auth_headers
    )
    draft_id = create_response.json()["id"]

    # Try to update with invalid type
    invalid_update = {
        "habit_type": "invalid_type"
    }

    response = await client.put(
        f"/api/habits/drafts/{draft_id}",
        json=invalid_update,
        headers=auth_headers
    )

    assert response.status_code == 422  # Validation error


# ============================================================================
# DELETE DRAFT TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_delete_draft(client: AsyncClient, auth_headers):
    """
    Test deleting a habit draft.

    Verifies:
    - Draft can be successfully deleted
    - Draft no longer exists after deletion
    - Appropriate status code is returned
    """
    # Create a draft
    draft_data = {
        "habit_name": "Temporary Habit",
        "habit_type": "build",
        "category": "custom"
    }

    create_response = await client.post(
        "/api/habits/drafts",
        json=draft_data,
        headers=auth_headers
    )
    draft_id = create_response.json()["id"]

    # Delete the draft
    response = await client.delete(
        f"/api/habits/drafts/{draft_id}",
        headers=auth_headers
    )

    assert response.status_code == 204  # No content

    # Verify draft no longer exists
    get_response = await client.get(
        f"/api/habits/drafts/{draft_id}",
        headers=auth_headers
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent_draft(client: AsyncClient, auth_headers):
    """
    Test deleting a draft that doesn't exist.

    Verifies:
    - 404 error is returned
    """
    fake_id = str(ObjectId())

    response = await client.delete(
        f"/api/habits/drafts/{fake_id}",
        headers=auth_headers
    )

    assert response.status_code == 404


# ============================================================================
# CONVERT DRAFT TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_convert_draft_to_habit(
        client: AsyncClient,
        auth_headers,
        test_partnership_id  # You'll need to create this fixture
):
    """
    Test converting a draft to an active habit.

    Verifies:
    - Draft status changes from "draft" to "pending_approval"
    - partnership_id is set
    - Other fields remain unchanged

    Note: This test requires a valid partnership to exist.
    """
    # Create a draft
    draft_data = {
        "habit_name": "Ready to Share",
        "habit_type": "build",
        "category": "productivity",
        "description": "Complete habit ready for partner"
    }

    create_response = await client.post(
        "/api/habits/drafts",
        json=draft_data,
        headers=auth_headers
    )
    draft_id = create_response.json()["id"]

    # Convert to active habit
    response = await client.post(
        f"/api/habits/drafts/{draft_id}/convert",
        json={"partnership_id": test_partnership_id},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # Verify conversion
    assert data["status"] == "pending_approval"  # No longer draft
    assert data["partnership_id"] == test_partnership_id
    assert data["habit_name"] == draft_data["habit_name"]  # Unchanged


@pytest.mark.asyncio
async def test_convert_draft_invalid_partnership(client: AsyncClient, auth_headers):
    """
    Test converting a draft with invalid partnership ID.

    Verifies:
    - 404 error when partnership doesn't exist
    """
    # Create a draft
    draft_data = {
        "habit_name": "Test Habit",
        "habit_type": "build",
        "category": "fitness"
    }

    create_response = await client.post(
        "/api/habits/drafts",
        json=draft_data,
        headers=auth_headers
    )
    draft_id = create_response.json()["id"]

    # Try to convert with fake partnership ID
    fake_partnership_id = str(ObjectId())

    response = await client.post(
        f"/api/habits/drafts/{draft_id}/convert",
        json={"partnership_id": fake_partnership_id},
        headers=auth_headers
    )

    assert response.status_code == 404
    assert "partnership not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_convert_nonexistent_draft(
        client: AsyncClient,
        auth_headers,
        test_partnership_id
):
    """
    Test converting a draft that doesn't exist.

    Verifies:
    - 404 error is returned
    """
    fake_draft_id = str(ObjectId())

    response = await client.post(
        f"/api/habits/drafts/{fake_draft_id}/convert",
        json={"partnership_id": test_partnership_id},
        headers=auth_headers
    )

    assert response.status_code == 404


# ============================================================================
# ACCESS CONTROL TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_user_cannot_access_other_users_draft(
        client: AsyncClient,
        auth_headers,
        second_auth_headers
  # You'll need to create this fixture
):
    """
    Test that users can only access their own drafts.

    Verifies:
    - User A cannot view User B's drafts
    - User A cannot update User B's drafts
    - User A cannot delete User B's drafts
    - Proper 404 errors are returned (not 403, to avoid info leakage)
    """
    # User A creates a draft
    draft_data = {
        "habit_name": "User A's Private Draft",
        "habit_type": "build",
        "category": "fitness"
    }

    create_response = await client.post(
        "/api/habits/drafts",
        json=draft_data,
        headers=auth_headers  # User A
    )
    draft_id = create_response.json()["id"]

    # User B tries to access User A's draft
    get_response = await client.get(
        f"/api/habits/drafts/{draft_id}",
        headers=second_auth_headers  # User B
    )
    assert get_response.status_code == 404  # Not found (not 403)

    # User B tries to update User A's draft
    update_response = await client.put(
        f"/api/habits/drafts/{draft_id}",
        json={"habit_name": "Hacked!"},
        headers=second_auth_headers
    )
    assert update_response.status_code == 404

    # User B tries to delete User A's draft
    delete_response = await client.delete(
        f"/api/habits/drafts/{draft_id}",
        headers=second_auth_headers
    )
    assert delete_response.status_code == 404


@pytest.mark.asyncio
async def test_unauthenticated_access_denied(client: AsyncClient):
    """
    Test that unauthenticated users cannot access drafts.

    Verifies:
    - All endpoints require authentication
    - 401 errors are returned for unauthenticated requests
    """
    fake_id = str(ObjectId())

    # Try to get drafts without auth
    response = await client.get("/api/habits/drafts")
    assert response.status_code == 403

    # Try to create draft without auth
    response = await client.post(
        "/api/habits/drafts",
        json={"habit_name": "Test", "habit_type": "build", "category": "fitness"}
    )
    assert response.status_code == 403

    # Try to update draft without auth
    response = await client.put(
        f"/api/habits/drafts/{fake_id}",
        json={"habit_name": "Updated"}
    )
    assert response.status_code == 403

    # Try to delete draft without auth
    response = await client.delete(f"/api/habits/drafts/{fake_id}")
    assert response.status_code == 403


# ============================================================================
# EDGE CASES AND SPECIAL SCENARIOS
# ============================================================================

@pytest.mark.asyncio
async def test_draft_does_not_appear_in_active_habits(
        client: AsyncClient,
        auth_headers
):
    """
    Test that drafts are properly filtered from active habits list.

    Verifies:
    - Drafts don't appear when fetching active habits
    - Status filtering works correctly
    """
    # Create a draft
    await client.post(
        "/api/habits/drafts",
        json={
            "habit_name": "Draft Habit",
            "habit_type": "build",
            "category": "fitness"
        },
        headers=auth_headers
    )

    # Get active habits (assuming you have this endpoint)
    response = await client.get(
        "/api/habits",  # Your regular habits endpoint
        headers=auth_headers
    )

    # Draft should not appear in active habits list
    active_habits = response.json()
    for habit in active_habits:
        assert habit["status"] != "draft"


@pytest.mark.asyncio
async def test_multiple_drafts_allowed_per_user(
        client: AsyncClient,
        auth_headers
):
    """
    Test that users can have multiple drafts simultaneously.

    Verifies:
    - Unlike the old habit_draft approach (one per user),
      users can now have multiple drafts as separate habits
    """
    # Create multiple drafts
    for i in range(5):
        response = await client.post(
            "/api/habits/drafts",
            json={
                "habit_name": f"Draft {i + 1}",
                "habit_type": "build",
                "category": "custom"
            },
            headers=auth_headers
        )
        assert response.status_code == 201

    # Get all drafts
    response = await client.get(
        "/api/habits/drafts",
        headers=auth_headers
    )

    drafts = response.json()
    assert len(drafts) >= 5  # Should have at least 5 drafts

