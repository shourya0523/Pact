"""
Clean up and recreate test users from scratch
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client[os.getenv("DATABASE_NAME", "pact_db")]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def clean_and_recreate():
    print("=" * 60)
    print("CLEAN START - Removing all test users and recreating")
    print("=" * 60)
    
    # Delete ALL users with test emails
    result = await db.users.delete_many({
        "email": {"$in": ["test1@pact.com", "test2@pact.com"]}
    })
    print(f"\n🗑️  Deleted {result.deleted_count} existing test users")
    
    # Create fresh test users
    print("\n📝 Creating fresh test users...\n")
    
    test_users = [
        {
            "username": "testuser1",
            "email": "test1@pact.com",
            "password": pwd_context.hash("password123"),
            "display_name": "Test User 1",
            "profile_completed": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "notification_preferences": {},
            "is_active": True
        },
        {
            "username": "testuser2", 
            "email": "test2@pact.com",
            "password": pwd_context.hash("password123"),
            "display_name": "Test User 2",
            "profile_completed": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "notification_preferences": {},
            "is_active": True
        }
    ]
    
    result = await db.users.insert_many(test_users)
    
    print(f"✅ Created testuser1 (ID: {result.inserted_ids[0]})")
    print(f"✅ Created testuser2 (ID: {result.inserted_ids[1]})")
    
    # Verify password works
    print("\n🔐 Verifying password...")
    user = await db.users.find_one({"email": "test1@pact.com"})
    is_valid = pwd_context.verify("password123", user['password'])
    
    if is_valid:
        print("✅ Password verification: SUCCESS!")
    else:
        print("❌ Password verification: FAILED!")
    
    print("\n" + "=" * 60)
    print("✅ DONE! Try logging in now:")
    print("   Email: test1@pact.com")
    print("   Password: password123")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clean_and_recreate())
