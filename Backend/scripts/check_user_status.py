"""
Check user status
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client[os.getenv("DATABASE_NAME", "pact_db")]

async def check_user_status():
    print("Checking testuser1 status...\n")
    
    user = await db.users.find_one({"email": "test1@pact.com"})
    
    if not user:
        print("❌ User not found!")
        client.close()
        return
    
    print(f"✅ User found: {user.get('username')}")
    print(f"   Email: {user.get('email')}")
    print(f"   ID: {str(user['_id'])}")
    print(f"   is_active: {user.get('is_active', 'NOT SET')}")
    print(f"   profile_completed: {user.get('profile_completed', 'NOT SET')}")
    
    # Fix if needed
    if not user.get('is_active'):
        print("\n⚠️  is_active is False or missing! Fixing...")
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"is_active": True}}
        )
        print("✅ Fixed! is_active is now True")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_user_status())
