
"""
Test fixtures and configuration for pytest.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Add Backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Load environment variables
load_dotenv(backend_dir / ".env")

# Import FastAPI app and dependencies
from main import app
from config.database import get_database


@pytest_asyncio.fixture
async def test_db():
    """Create test database connection."""
    mongodb_url = os.getenv("MONGODB_URL")
    database_name = "pact_test"  # Use test database

    client = AsyncIOMotorClient(mongodb_url)
    test_db = client[database_name]

    yield test_db

    # Cleanup - drop all collections after tests
    for collection_name in await test_db.list_collection_names():
        await test_db[collection_name].drop()

    client.close()


@pytest_asyncio.fixture
async def client(test_db):
    """Create async test client."""

    # Override database dependency
    async def override_get_database():
        return test_db

    app.dependency_overrides[get_database] = override_get_database

    # Create client
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    # Cleanup
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(test_db):
    """Create test user."""
    from app.utils.security import hash_password

    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": hash_password("testpass123"),  # ✅ Changed from "hashed_password"
        "created_at": datetime.utcnow()
    }

    result = await test_db.users.insert_one(user_data)
    user_data["_id"] = result.inserted_id

    return user_data


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, test_user):
    """Get auth headers with Bearer token."""
    response = await client.post(
        "/api/auth/login",
        json={
            "email": test_user["email"],
            "password": "testpass123"
        }
    )

    assert response.status_code == 200
    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def second_test_user(test_db):
    """Create second test user for partnership tests."""
    from app.utils.security import hash_password

    user_data = {
        "username": "testuser2",
        "email": "test2@example.com",
        "password": hash_password("testpass123"),  # ✅ Changed from "hashed_password"
        "created_at": datetime.utcnow()
    }

    result = await test_db.users.insert_one(user_data)
    user_data["_id"] = result.inserted_id

    return user_data


@pytest_asyncio.fixture
async def second_auth_headers(client: AsyncClient, second_test_user):
    """Get auth headers for second user."""
    response = await client.post(
        "/api/auth/login",
        json={
            "email": second_test_user["email"],
            "password": "testpass123"
        }
    )

    assert response.status_code == 200
    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}