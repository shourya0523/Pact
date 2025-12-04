"""
Quick script to check how many users are in the database
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client[os.getenv("DATABASE_NAME", "pact_db")]

async def check_users():
    print("Checking users in database...")
    
    users = await db.users.find().to_list(100)
    
    print(f"\n✅ Found {len(users)} users in database:")
    for i, user in enumerate(users, 1):
        print(f"  {i}. {user.get('username')} (ID: {str(user['_id'])})")
    
    if len(users) < 2:
        print("\n❌ You need at least 2 users to create test notifications")
        print("💡 Create accounts in your app or use the signup endpoint")
    else:
        print("\n✅ You have enough users! Run populate_test_notifications.py now")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_users())
