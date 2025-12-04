"""
Check if notifications exist for testuser1
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client[os.getenv("DATABASE_NAME", "pact_db")]

async def check_notifications():
    print("Checking notifications...\n")
    
    # Get testuser1
    user = await db.users.find_one({"email": "test1@pact.com"})
    
    if not user:
        print("❌ User not found!")
        client.close()
        return
    
    user_id = str(user["_id"])
    print(f"✅ User: {user.get('username')} (ID: {user_id})")
    print(f"   is_active: {user.get('is_active')}")
    
    # Get notifications
    notifications = await db.notifications.find({"user_id": user_id}).to_list(100)
    
    print(f"\n📬 Found {len(notifications)} notifications:")
    for notif in notifications:
        print(f"   • {notif.get('title')}")
    
    if len(notifications) == 0:
        print("\n❌ NO NOTIFICATIONS! That's the problem.")
        print("   The user_id in notifications doesn't match the logged-in user's ID")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_notifications())
