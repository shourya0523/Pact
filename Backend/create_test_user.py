"""
Script to create a test user in the database
Run this from the Backend directory: python create_test_user.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.utils.security import hash_password
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

async def create_test_user():
    # Get MongoDB connection string from environment
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(mongo_uri)
    db = client.pact_db
    
    # Test user data
    test_user = {
        "username": "testuser",
        "email": "test@pact.com",
        "password": hash_password("password123"),  # Password: password123
        "created_at": datetime.utcnow(),
        "notification_preferences": {},
        "is_active": True,
        "display_name": "Test User"
    }
    
    # Check if user already exists
    existing = await db.users.find_one({"email": test_user["email"]})
    
    if existing:
        print("❌ Test user already exists!")
        print(f"   Email: {test_user['email']}")
        print(f"   Password: password123")
    else:
        # Insert test user
        result = await db.users.insert_one(test_user)
        print("✅ Test user created successfully!")
        print(f"   Email: {test_user['email']}")
        print(f"   Password: password123")
        print(f"   User ID: {result.inserted_id}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_user())
