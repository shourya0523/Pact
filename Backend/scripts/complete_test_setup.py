"""
Create complete working test setup:
1. Create partnership between testuser1 and testuser2
2. Create habits for that partnership
3. Create notifications with valid IDs
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


async def setup_complete_test_environment():
    """Create everything needed for working notifications"""
    
    print("=" * 60)
    print("COMPLETE TEST ENVIRONMENT SETUP")
    print("=" * 60)
    
    # Get users
    users = await db.users.find().limit(2).to_list(2)
    if len(users) < 2:
        print("❌ Need 2 users!")
        return
    
    user1 = users[0]
    user2 = users[1]
    user1_id = str(user1["_id"])
    user2_id = str(user2["_id"])
    
    print(f"\n✅ Users:")
    print(f"   {user1.get('username')} (ID: {user1_id})")
    print(f"   {user2.get('username')} (ID: {user2_id})")
    
    # Step 1: Create an ACTIVE partnership
    print(f"\n📝 Step 1: Creating active partnership...")
    
    # Clear old partnerships
    await db.partnerships.delete_many({
        "$or": [
            {"user_id_1": user1["_id"]},
            {"user_id_2": user1["_id"]}
        ]
    })
    await db.habit_logs.delete_many({})  # Clear old logs
    
    partnership = {
        "user_id_1": user1["_id"],
        "user_id_2": user2["_id"],
        "status": "active",
        "created_at": datetime.utcnow() - timedelta(days=10)
    }
    
    partnership_result = await db.partnerships.insert_one(partnership)
    partnership_id = str(partnership_result.inserted_id)
    print(f"   ✅ Partnership created: {partnership_id}")
    
    # Step 2: Create habits for this partnership
    print(f"\n📝 Step 2: Creating habits...")
    
    # Clear old habits
    await db.habits.delete_many({})
    
    habits_data = [
        {
            "habit_name": "Morning Workout",
            "habit_type": "fitness",
            "category": "fitness",
            "description": "30 min workout",
            "goal": "30",
            "frequency": "daily",
            "partnership_id": partnership_id,
            "current_streak": 5,
            "status": "active",
            "created_by": user1_id,
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "habit_name": "Study Every Day",
            "habit_type": "education",
            "category": "education", 
            "description": "Study for 1 hour",
            "goal": "60",
            "frequency": "daily",
            "partnership_id": partnership_id,
            "current_streak": 3,
            "status": "active",
            "created_by": user1_id,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
    ]
    
    habits_result = await db.habits.insert_many(habits_data)
    habit_ids = [str(id) for id in habits_result.inserted_ids]
    print(f"   ✅ Created {len(habit_ids)} habits")
    
    # Step 3: Create notifications
    print(f"\n📝 Step 3: Creating notifications...")
    
    await db.notifications.delete_many({"user_id": user1_id})
    
    notifications = [
        {
            "user_id": user1_id,
            "type": "partner_nudge",
            "title": f"{user2.get('username')} is nudging you to hit the gym!",
            "message": "Time to work on those gains!",
            "related_id": habit_ids[0],
            "related_user_id": user2_id,
            "is_read": False,
            "action_taken": False,
            "created_at": datetime.utcnow() - timedelta(minutes=1)
        },
        {
            "user_id": user1_id,
            "type": "partner_checkin",
            "title": f"{user2.get('username')} checked in today!",
            "message": "Don't break the streak!",
            "related_id": habit_ids[0],
            "related_user_id": user2_id,
            "is_read": False,
            "action_taken": False,
            "created_at": datetime.utcnow() - timedelta(hours=3)
        },
        {
            "user_id": user1_id,
            "type": "habit_reminder",
            "title": "Check in for your Study Every Day...",
            "message": "Time to work on your habit!",
            "related_id": habit_ids[1],
            "is_read": False,
            "action_taken": False,
            "created_at": datetime.utcnow()
        },
        {
            "user_id": user1_id,
            "type": "progress_milestone",
            "title": "You have reached 50% progress on your Workout...",
            "message": "You're halfway there! Keep going!",
            "related_id": habit_ids[0],
            "is_read": False,
            "action_taken": False,
            "created_at": datetime.utcnow() - timedelta(days=22)
        },
        {
            "user_id": user1_id,
            "type": "missed_habit",
            "title": "Ups, You have missed your Study...",
            "message": "Don't worry, get back on track today!",
            "related_id": habit_ids[1],
            "is_read": False,
            "action_taken": False,
            "created_at": datetime.utcnow() - timedelta(days=27)
        }
    ]
    
    notif_result = await db.notifications.insert_many(notifications)
    print(f"   ✅ Created {len(notif_result.inserted_ids)} notifications")
    
    print("\n" + "=" * 60)
    print("✅ COMPLETE TEST ENVIRONMENT READY!")
    print("=" * 60)
    print(f"\n📝 What was created:")
    print(f"   • 1 active partnership")
    print(f"   • {len(habit_ids)} habits")
    print(f"   • {len(notifications)} notifications")
    print(f"\n💡 Refresh notifications in your app and try CHECK IN buttons!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(setup_complete_test_environment())
