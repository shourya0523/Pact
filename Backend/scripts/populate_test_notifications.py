"""
Script to populate test notification data for development
Run this after your backend server is running to create sample notifications
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGODB_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client[os.getenv("DATABASE_NAME", "pact_db")]


async def create_test_notifications():
    """Create sample notifications for testing"""
    
    print("🔍 Finding test users...")
    
    # Get two test users
    users = await db.users.find().limit(2).to_list(2)
    
    if len(users) < 2:
        print("❌ Need at least 2 users in the database to create test notifications")
        return
    
    user1 = users[0]
    user2 = users[1]
    
    user1_id = str(user1["_id"])
    user2_id = str(user2["_id"])
    
    print(f"✅ Found users: {user1.get('username')} and {user2.get('username')}")
    
    # Get a test habit
    habit = await db.habits.find_one()
    habit_id = str(habit["_id"]) if habit else None
    
    # Clear existing test notifications (optional)
    await db.notifications.delete_many({})
    print("🗑️  Cleared old notifications")
    
    # Create sample notifications for user1
    notifications = [
        {
            "user_id": user1_id,
            "type": "partner_nudge",
            "title": f"{user2.get('username', 'Your partner')} is nudging you to hit the gym!",
            "message": "Time to work on those gains!",
            "related_id": habit_id,
            "related_user_id": user2_id,
            "is_read": False,
            "action_taken": False,
            "created_at": datetime.utcnow() - timedelta(minutes=1)
        },
        {
            "user_id": user1_id,
            "type": "partnership_request",
            "title": f"Partnership request from {user2.get('username', 'Someone')}...",
            "message": "Accept to start building habits together!",
            "related_id": "test_request_id_123",
            "related_user_id": user2_id,
            "is_read": False,
            "action_taken": False,
            "created_at": datetime.utcnow() - timedelta(hours=3)
        },
        {
            "user_id": user1_id,
            "type": "partner_checkin",
            "title": f"{user2.get('username', 'Your partner')} checked in today!",
            "message": "Don't break the streak!",
            "related_id": habit_id,
            "related_user_id": user2_id,
            "is_read": False,
            "action_taken": False,
            "created_at": datetime.utcnow() - timedelta(hours=3)
        },
        {
            "user_id": user1_id,
            "type": "habit_reminder",
            "title": "Check in for your Study Every...",
            "message": "Time to work on your habit!",
            "related_id": habit_id,
            "is_read": False,
            "action_taken": False,
            "created_at": datetime.utcnow() - timedelta(days=0, hours=0, minutes=0)
        },
        {
            "user_id": user1_id,
            "type": "progress_milestone",
            "title": "You have reached 50% progress on your Workout...",
            "message": "You're halfway there! Keep going!",
            "related_id": habit_id,
            "is_read": False,
            "action_taken": False,
            "created_at": datetime.utcnow() - timedelta(days=22)
        },
        {
            "user_id": user1_id,
            "type": "missed_habit",
            "title": "Ups, You have missed your Lowerbo...",
            "message": "Don't worry, get back on track today!",
            "related_id": habit_id,
            "is_read": False,
            "action_taken": False,
            "created_at": datetime.utcnow() - timedelta(days=27)
        }
    ]
    
    # Insert notifications
    result = await db.notifications.insert_many(notifications)
    print(f"✅ Created {len(result.inserted_ids)} test notifications for {user1.get('username')}")
    
    # Create a partner request in partner_requests collection for testing
    if habit_id:
        partner_request = {
            "sender_id": user2["_id"],
            "receiver_id": user1["_id"],
            "status": "pending",
            "message": "Let's build habits together!",
            "created_at": datetime.utcnow() - timedelta(hours=3)
        }
        
        request_result = await db.partner_requests.insert_one(partner_request)
        print(f"✅ Created test partner request: {request_result.inserted_id}")
        
        # Update the partnership_request notification with the real request ID
        await db.notifications.update_one(
            {
                "user_id": user1_id,
                "type": "partnership_request"
            },
            {
                "$set": {
                    "related_id": str(request_result.inserted_id)
                }
            }
        )
        print("✅ Updated partnership_request notification with real request ID")
    
    print("\n🎉 Test notifications created successfully!")
    print(f"📱 User {user1.get('username')} now has {len(notifications)} notifications")
    print("\n💡 You can now view these in the app Notifications screen")


async def main():
    print("=" * 50)
    print("Creating Test Notifications")
    print("=" * 50)
    
    try:
        await create_test_notifications()
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
    finally:
        client.close()
        print("\n✅ Database connection closed")


if __name__ == "__main__":
    asyncio.run(main())
