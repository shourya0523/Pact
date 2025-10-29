import pytest
import pytest_asyncio
from bson import ObjectId
from datetime import datetime


class TestBadgesAPI:
    """Test cases for badges API endpoints - KAN-80, KAN-81, KAN-82, KAN-83"""

    # Supporting endpoints - Badge CRUD
    @pytest.mark.asyncio
    async def test_create_badge_success(self, client, auth_headers, test_db):
        """Test creating a new badge successfully"""
        badge_data = {
            "name": "Test Badge",
            "description": "A test badge for testing", 
            "category": "achievement",
            "level": "silver",
            "icon_url": "https://example.com/icon.png",
            "criteria": {"actions_required": 5}
        }

        response = await client.post(
            "/api/badges",
            json=badge_data,
            headers=auth_headers
        )
    
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == badge_data["name"]
        assert data["description"] == badge_data["description"]
        assert data["category"] == badge_data["category"]
        assert data["level"] == badge_data["level"]
        assert data["icon_url"] == badge_data["icon_url"]
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.asyncio
    async def test_create_badge_unauthorized(self, client):
        """Test creating badge without authentication"""
        badge_data = {
            "name": "Test Badge",
            "description": "A test badge",
            "category": "achievement"
        }

        response = await client.post("/api/badges", json=badge_data)
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_all_badges(self, client, auth_headers, test_db):
        """Test retrieving all badges"""
        badge1 = {
            "name": "Badge 1",
            "description": "First test badge",
            "category": "achievement",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        badge2 = {
            "name": "Badge 2", 
            "description": "Second test badge",
            "category": "milestone",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        await test_db.badges.insert_many([badge1, badge2])

        response = await client.get("/api/badges", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert any(badge["name"] == "Badge 1" for badge in data)
        assert any(badge["name"] == "Badge 2" for badge in data)

    @pytest.mark.asyncio
    async def test_get_single_badge(self, client, auth_headers, test_db):
        """Test retrieving a specific badge by ID"""
        badge_data = {
            "name": "Specific Badge",
            "description": "A specific test badge",
            "category": "achievement",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = await test_db.badges.insert_one(badge_data)
        badge_id = str(result.inserted_id)

        response = await client.get(f"/api/badges/{badge_id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == badge_id
        assert data["name"] == "Specific Badge"

    @pytest.mark.asyncio
    async def test_get_nonexistent_badge(self, client, auth_headers):
        """Test retrieving a badge that doesn't exist"""
        fake_id = "507f1f77bcf86cd799439011"
        
        response = await client.get(f"/api/badges/{fake_id}", headers=auth_headers)
        assert response.status_code == 404

    # KAN-81: Assign badge to user
    @pytest.mark.asyncio
    async def test_assign_badge_to_user(
        self, client, auth_headers, test_db, test_user
    ):
        """KAN-81: Test assigning a badge to a user"""
        badge_data = {
            "name": "Assignable Badge",
            "description": "A badge to assign",
            "category": "achievement",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        badge_result = await test_db.badges.insert_one(badge_data)
        badge_id = str(badge_result.inserted_id)

        assign_data = {
            "badge_id": badge_id
        }

        response = await client.post(
            f"/api/badges/users/{test_user['_id']}/assign",
            json=assign_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == str(test_user["_id"])
        assert data["badge_id"] == badge_id
        assert data["badge"]["name"] == "Assignable Badge"
        assert "assigned_date" in data

    @pytest.mark.asyncio
    async def test_assign_badge_to_nonexistent_user(
        self, client, auth_headers, test_db
    ):
        """Test assigning badge to non-existent user"""
        badge_data = {
            "name": "Test Badge",
            "description": "A test badge",
            "category": "achievement",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        badge_result = await test_db.badges.insert_one(badge_data)
        badge_id = str(badge_result.inserted_id)

        fake_user_id = "507f1f77bcf86cd799439011"
        assign_data = {
            "badge_id": badge_id
        }

        response = await client.post(
            f"/api/badges/users/{fake_user_id}/assign",
            json=assign_data,
            headers=auth_headers
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_assign_nonexistent_badge(
        self, client, auth_headers, test_user
    ):
        """Test assigning non-existent badge to user"""
        fake_badge_id = "507f1f77bcf86cd799439011"
        assign_data = {
            "badge_id": fake_badge_id
        }

        response = await client.post(
            f"/api/badges/users/{test_user['_id']}/assign",
            json=assign_data,
            headers=auth_headers
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_assign_duplicate_badge(
        self, client, auth_headers, test_db, test_user
    ):
        """Test assigning the same badge twice to a user"""
        badge_data = {
            "name": "Duplicate Badge",
            "description": "Test duplicate assignment",
            "category": "achievement",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        badge_result = await test_db.badges.insert_one(badge_data)
        badge_id = str(badge_result.inserted_id)

        assign_data = {
            "badge_id": badge_id
        }

        # First assignment - should succeed
        response1 = await client.post(
            f"/api/badges/users/{test_user['_id']}/assign",
            json=assign_data,
            headers=auth_headers
        )
        assert response1.status_code == 200

        # Second assignment - should fail
        response2 = await client.post(
            f"/api/badges/users/{test_user['_id']}/assign",
            json=assign_data,
            headers=auth_headers
        )
        assert response2.status_code == 400

    # KAN-80: Get user badges
    @pytest.mark.asyncio
    async def test_get_user_badges_own_user(
        self, client, auth_headers, test_db, test_user
    ):
        """KAN-80: Test user retrieving their own badges"""
        badge_data = {
            "name": "User Badge",
            "description": "A badge for the user",
            "category": "achievement",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        badge_result = await test_db.badges.insert_one(badge_data)
        badge_id = str(badge_result.inserted_id)

        user_badge_data = {
            "user_id": str(test_user["_id"]),
            "badge_id": badge_id,
            "assigned_date": datetime.utcnow(),
            "shown": False
        }
        await test_db.user_badges.insert_one(user_badge_data)

        response = await client.get(
            f"/api/badges/users/{test_user['_id']}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["user_id"] == str(test_user["_id"])
        assert data[0]["badge_id"] == badge_id

    @pytest.mark.asyncio
    async def test_get_user_badges_partner_access(
        self, client, test_db, test_user, second_test_user, 
        second_auth_headers
    ):
        """KAN-80: Test partner accessing user's badges"""
        # Create partnership first
        partnership_data = {
            "user_id_1": str(test_user["_id"]),
            "user_id_2": str(second_test_user["_id"]),
            "status": "active",
            "created_at": datetime.utcnow()
        }
        await test_db.partnerships.insert_one(partnership_data)

        # Create and assign a badge to test_user
        badge_data = {
            "name": "Partner Badge",
            "description": "A badge visible to partner",
            "category": "achievement",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        badge_result = await test_db.badges.insert_one(badge_data)
        badge_id = str(badge_result.inserted_id)

        user_badge_data = {
            "user_id": str(test_user["_id"]),
            "badge_id": badge_id,
            "assigned_date": datetime.utcnow(),
            "shown": True
        }
        await test_db.user_badges.insert_one(user_badge_data)

        # Second user (partner) accessing first user's badges
        response = await client.get(
            f"/api/badges/users/{test_user['_id']}",
            headers=second_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["user_id"] == str(test_user["_id"])

    @pytest.mark.asyncio
    async def test_get_user_badges_unauthorized_access(
        self, client, test_db, test_user, second_test_user, 
        second_auth_headers
    ):
        """KAN-80: Test unauthorized user trying to access another user's badges"""
        # Create badge for test_user (no partnership exists)
        badge_data = {
            "name": "Private Badge",
            "description": "A private badge",
            "category": "achievement",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        badge_result = await test_db.badges.insert_one(badge_data)
        badge_id = str(badge_result.inserted_id)

        user_badge_data = {
            "user_id": str(test_user["_id"]),
            "badge_id": badge_id,
            "assigned_date": datetime.utcnow(),
            "shown": False
        }
        await test_db.user_badges.insert_one(user_badge_data)

        # Second user trying to access first user's badges without partnership
        response = await client.get(
            f"/api/badges/users/{test_user['_id']}",
            headers=second_auth_headers
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_user_badges_shown_filter(
        self, client, auth_headers, test_db, test_user
    ):
        """KAN-80: Test filtering user badges by shown status"""
        # Create badges
        badge1_data = {"name": "Shown Badge", "description": "Shown", "category": "test"}
        badge2_data = {"name": "Hidden Badge", "description": "Hidden", "category": "test"}
        
        badge1_result = await test_db.badges.insert_one(badge1_data)
        badge2_result = await test_db.badges.insert_one(badge2_data)
        
        badge1_id = str(badge1_result.inserted_id)
        badge2_id = str(badge2_result.inserted_id)

        # Assign badges with different shown status
        user_badge1 = {
            "user_id": str(test_user["_id"]),
            "badge_id": badge1_id,
            "assigned_date": datetime.utcnow(),
            "shown": True
        }
        user_badge2 = {
            "user_id": str(test_user["_id"]),
            "badge_id": badge2_id,
            "assigned_date": datetime.utcnow(),
            "shown": False
        }
        await test_db.user_badges.insert_many([user_badge1, user_badge2])

        # Test with shown_only=True
        response = await client.get(
            f"/api/badges/users/{test_user['_id']}?shown_only=true",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["shown"] == True

    # KAN-82: Get users who have earned specific badges
    @pytest.mark.asyncio
    async def test_get_users_with_badge(
        self, client, auth_headers, test_db, test_user, second_test_user
    ):
        """KAN-82: Test getting all users who have earned a specific badge"""
        badge_data = {
            "name": "Popular Badge",
            "description": "A badge many users have",
            "category": "achievement", 
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        badge_result = await test_db.badges.insert_one(badge_data)
        badge_id = str(badge_result.inserted_id)

        # Assign badge to multiple users
        user_badge1 = {
            "user_id": str(test_user["_id"]),
            "badge_id": badge_id,
            "assigned_date": datetime.utcnow(),
            "shown": True
        }
        user_badge2 = {
            "user_id": str(second_test_user["_id"]),
            "badge_id": badge_id, 
            "assigned_date": datetime.utcnow(),
            "shown": True
        }
        await test_db.user_badges.insert_many([user_badge1, user_badge2])

        response = await client.get(
            f"/api/badges/{badge_id}/users",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        user_ids = [item["user_id"] for item in data]
        assert str(test_user["_id"]) in user_ids
        assert str(second_test_user["_id"]) in user_ids

    # KAN-83: Get recently assigned badges
    @pytest.mark.asyncio
    async def test_get_recent_badge_assignments(
        self, client, auth_headers, test_db, test_user
    ):
        """KAN-83: Test getting recently assigned badges"""
        badge_data = {
            "name": "Recent Badge",
            "description": "A recently assigned badge",
            "category": "achievement",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        badge_result = await test_db.badges.insert_one(badge_data)
        badge_id = str(badge_result.inserted_id)

        user_badge_data = {
            "user_id": str(test_user["_id"]),
            "badge_id": badge_id,
            "assigned_date": datetime.utcnow(),
            "shown": False
        }
        await test_db.user_badges.insert_one(user_badge_data)

        response = await client.get(
            "/api/badges/recent/assignments?limit=5",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["badge_id"] == badge_id

    # Badge visibility management
    @pytest.mark.asyncio
    async def test_mark_badge_shown(
        self, client, auth_headers, test_db, test_user
    ):
        """Test marking a badge as shown/acknowledged"""
        badge_data = {
            "name": "Visibility Badge",
            "description": "A badge for visibility testing",
            "category": "achievement",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        badge_result = await test_db.badges.insert_one(badge_data)
        badge_id = str(badge_result.inserted_id)

        user_badge_data = {
            "user_id": str(test_user["_id"]),
            "badge_id": badge_id,
            "assigned_date": datetime.utcnow(),
            "shown": False
        }
        user_badge_result = await test_db.user_badges.insert_one(user_badge_data)
        user_badge_id = str(user_badge_result.inserted_id)

        update_data = {"shown": True}

        response = await client.patch(
            f"/api/badges/user-badges/{user_badge_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["shown"] == True
        assert data["id"] == user_badge_id

    @pytest.mark.asyncio
    async def test_mark_other_users_badge_shown(
        self, client, test_db, test_user, second_test_user, 
        second_auth_headers
    ):
        """Test that users can't mark other users' badges as shown"""
        badge_data = {
            "name": "Other User Badge", 
            "description": "Another user's badge",
            "category": "achievement",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        badge_result = await test_db.badges.insert_one(badge_data)
        badge_id = str(badge_result.inserted_id)

        user_badge_data = {
            "user_id": str(test_user["_id"]),
            "badge_id": badge_id,
            "assigned_date": datetime.utcnow(),
            "shown": False
        }
        user_badge_result = await test_db.user_badges.insert_one(user_badge_data)
        user_badge_id = str(user_badge_result.inserted_id)

        # Second user trying to update first user's badge
        update_data = {"shown": True}
        
        response = await client.patch(
            f"/api/badges/user-badges/{user_badge_id}",
            json=update_data,
            headers=second_auth_headers
        )

        assert response.status_code == 404

    # Error cases
    @pytest.mark.asyncio
    async def test_invalid_badge_id_format(self, client, auth_headers):
        """Test with invalid badge ID format"""
        response = await client.get("/api/badges/invalid-id", headers=auth_headers)
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_missing_required_fields(self, client, auth_headers):
        """Test creating badge with missing required fields"""
        incomplete_data = {
            "description": "Missing name field",
            "category": "achievement"
        }

        response = await client.post(
            "/api/badges",
            json=incomplete_data,
            headers=auth_headers
        )
        assert response.status_code == 422