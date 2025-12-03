"""
Create test users in the database
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

async def create_test_users():
    print("=" * 50)
    print("Creating Test Users")
    print("=" * 50)
    
    # Check if users already exist
    existing_count = await db.users.count_documents({})
    if existing_count >= 2:
        print(f"✅ Database already has {existing_count} users")
        users = await db.users.find().to_list(100)
        for i, user in enumerate(users, 1):
            print(f"  {i}. {user.get('username')} - {user.get('email')}")
        print("\n✅ Ready to create notifications!")
        client.close()
        return
    
    print(f"📝 Found {existing_count} users, creating test accounts...\n")
    
    # Create two test users
    test_users = [
        {
            "username": "testuser1",
            "email": "test1@pact.com",
            "password": pwd_context.hash("password123"),
            "display_name": "Test User 1",
            "profile_completed": True,
            "created_at": datetime.utcnow()
        },
        {
            "username": "testuser2",
            "email": "test2@pact.com",
            "password": pwd_context.hash("password123"),
            "display_name": "Test User 2",
            "profile_completed": True,
            "created_at": datetime.utcnow()
        }
    ]
    
    # Insert users
    for user in test_users:
        # Check if user with this email already exists
        existing = await db.users.find_one({"email": user["email"]})
        if existing:
            print(f"⚠️  User {user['username']} already exists")
        else:
            result = await db.users.insert_one(user)
            print(f"✅ Created user: {user['username']} (ID: {result.inserted_id})")
    
    print("\n" + "=" * 50)
    print("✅ Test users created successfully!")
    print("=" * 50)
    print("\n📝 Login credentials:")
    print("   Username: testuser1")
    print("   Email: test1@pact.com")
    print("   Password: password123")
    print("\n   Username: testuser2")
    print("   Email: test2@pact.com")
    print("   Password: password123")
    print("\n💡 Now run: python3 scripts/populate_test_notifications.py")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_users())
