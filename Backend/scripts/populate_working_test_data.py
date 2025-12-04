"""
Script to populate WORKING test notification data
Creates real partnership requests and habits
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client[os.getenv("DATABASE_NAME", "pact_db")]


async def create_working_test_data():
    """Create test data that actually works"""
    
    print("=" * 60)
    print("Creating WORKING Test Data")
    print("=" * 60)
    
    # Get two test users
    users = await db.users.find().limit(2).to_list(2)
    
    if len(users) < 2:
        print("❌ Need at least 2 users in the database")
        return
    
    user1 = users[0]
    user2 = users[1]
    
    user1_id = str(user1["_id"])
    user2_id = str(user2["_id"])
    
    print(f"\n✅ Users:")
    print(f"   User 1: {user1.get('username')} ({user1_id})")
    print(f"   User 2: {user2.get('username')} ({user2_id})")
    
    # Clear old data
    await db.notifications.delete_many({"user_id": user1_id})
    await db.partner_requests.delete_many({
        "$or": [
            {"sender_id": user1["_id"]},
            {"receiver_id": user1["_id"]}
        ]
    })
    print("\n🗑️  Cleared old notifications and requests")
    
    # Create a test habit for user1
    test_habit = {
        "habit_name": "Morning Workout",
        "habit_type": "fitness",
        "category": "fitness",
        "description": "30 min workout",
        "goal": "30",
        "frequency": "daily",
        "current_streak": 5,
        "status": "active",
        "created_by": user1_id,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    habit_result = await db.habits.insert_one(test_habit)
    habit_id = str(habit_result.inserted_id)
    print(f"\n✅ Created test habit: {habit_id}")
    
    # Create a REAL partnership request
    partner_request = {
        "sender_id": user2["_id"],
        "receiver_id": user1["_id"],
        "status": "pending",
        "message": "Let's build habits together!",
        "sent_at": datetime.utcnow() - timedelta(hours=3)
    }
    
    request_result = await db.partner_requests.insert_one(partner_request)
    request_id = str(request_result.inserted_id)
    print(f"✅ Created REAL partnership request: {request_id}")
    
    # Create notifications with REAL IDs
    notifications = [
        {
            "user_id": user1_id,
            "type": "partner_nudge",
            "title": f"{user2.get('username')} is nudging you to hit the gym!",
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
            "title": f"Partnership request from {user2.get('username')}...",
            "message": "Accept to start building habits together!",
            "related_id": request_id,  # REAL request ID
            "related_user_id": user2_id,
            "is_read": False,
            "action_taken": False,
            "created_at": datetime.utcnow() - timedelta(hours=3)
        },
        {
            "user_id": user1_id,
            "type": "partner_checkin",
            "title": f"{user2.get('username')} checked in today!",
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
            "created_at": datetime.utcnow()
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
    print(f"\n✅ Created {len(result.inserted_ids)} notifications")
    
    print("\n" + "=" * 60)
    print("✅ ALL DATA CREATED SUCCESSFULLY!")
    print("=" * 60)
    print(f"\n📝 Summary:")
    print(f"   • Habit ID: {habit_id}")
    print(f"   • Partnership Request ID: {request_id}")
    print(f"   • {len(notifications)} notifications for {user1.get('username')}")
    print(f"\n💡 Now refresh the Notifications screen in your app!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(create_working_test_data())
