"""
Script to populate test user with habits, partnerships, and check-ins
Run this from the Backend directory: python3 populate_test_data.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

async def populate_test_data():
    # Get MongoDB connection string from environment
    mongo_uri = os.getenv("MONGODB_URL")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(mongo_uri)
    db = client.pact
    
    # Find the test user
    test_user = await db.users.find_one({"email": "test@pact.com"})
    
    if not test_user:
        print("❌ Test user not found! Run create_test_user.py first.")
        client.close()
        return
    
    test_user_id = str(test_user["_id"])
    print(f"✅ Found test user: {test_user['email']} (ID: {test_user_id})")
    
    # Create a partner user
    partner_email = "partner@pact.com"
    existing_partner = await db.users.find_one({"email": partner_email})
    
    if existing_partner:
        partner_id = str(existing_partner["_id"])
        print(f"✅ Partner user already exists: {partner_email}")
    else:
        from app.utils.security import hash_password
        partner_user = {
            "username": "partner_user",
            "email": partner_email,
            "password": hash_password("password123"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "notification_preferences": {},
            "is_active": True,
            "display_name": "Partner Friend",
            "profile_photo_url": "",
            "profile_completed": True
        }
        result = await db.users.insert_one(partner_user)
        partner_id = str(result.inserted_id)
        print(f"✅ Created partner user: {partner_email}")
    
    # Create a partnership
    existing_partnership = await db.partnerships.find_one({
        "$or": [
            {"user_id_1": ObjectId(test_user_id), "user_id_2": ObjectId(partner_id)},
            {"user_id_1": ObjectId(partner_id), "user_id_2": ObjectId(test_user_id)}
        ]
    })
    
    if existing_partnership:
        partnership_id = str(existing_partnership["_id"])
        print(f"✅ Partnership already exists")
    else:
        partnership = {
            "user_id_1": ObjectId(test_user_id),
            "user_id_2": ObjectId(partner_id),
            "status": "active",
            "created_at": datetime.utcnow() - timedelta(days=30),  # 30 days ago
            "current_streak": 0,
            "longest_streak": 0,
            "total_points": 0
        }
        result = await db.partnerships.insert_one(partnership)
        partnership_id = str(result.inserted_id)
        print(f"✅ Created partnership")
    
    # Create habits
    habits_data = [
        {
            "habit_name": "Morning Workout",
            "habit_type": "build",
            "category": "fitness",
            "description": "Exercise for 30 minutes every morning",
            "goal": 30,
            "frequency": "daily",
            "streak": 7
        },
        {
            "habit_name": "Read Books",
            "habit_type": "build",
            "category": "learning",
            "description": "Read for at least 20 minutes",
            "goal": 20,
            "frequency": "daily",
            "streak": 14
        },
        {
            "habit_name": "Meditation",
            "habit_type": "build",
            "category": "mindfulness",
            "description": "Practice meditation daily",
            "goal": 10,
            "frequency": "daily",
            "streak": 3
        },
        {
            "habit_name": "Drink Water",
            "habit_type": "build",
            "category": "health",
            "description": "Drink 8 glasses of water",
            "goal": 8,
            "frequency": "daily",
            "streak": 21
        }
    ]
    
    created_habits = []
    for habit_data in habits_data:
        # Check if habit already exists
        existing_habit = await db.habits.find_one({
            "habit_name": habit_data["habit_name"],
            "partnership_id": partnership_id
        })
        
        if existing_habit:
            print(f"  ⚠️  Habit '{habit_data['habit_name']}' already exists")
            created_habits.append(existing_habit)
            continue
        
        habit = {
            "habit_name": habit_data["habit_name"],
            "habit_type": habit_data["habit_type"],
            "category": habit_data["category"],
            "description": habit_data["description"],
            "goal": habit_data["goal"],
            "frequency": habit_data["frequency"],
            "partnership_id": partnership_id,
            "status": "active",
            "created_by": test_user_id,
            "approved_by": partner_id,
            "count_checkins": 0,
            "current_streak": habit_data["streak"],
            "longest_streak": habit_data["streak"],
            "created_at": datetime.utcnow() - timedelta(days=habit_data["streak"]),
            "updated_at": datetime.utcnow(),
            "is_active": True
        }
        
        result = await db.habits.insert_one(habit)
        habit["_id"] = result.inserted_id
        created_habits.append(habit)
        print(f"  ✅ Created habit: {habit_data['habit_name']} (streak: {habit_data['streak']})")
    
    # Create check-in logs for the last 7 days
    print("\n📝 Creating check-in logs...")
    for habit in created_habits:
        habit_id = str(habit["_id"])
        streak_days = habit["current_streak"]
        
        for day_offset in range(min(streak_days, 7)):  # Last 7 days
            check_in_date = datetime.utcnow() - timedelta(days=day_offset)
            check_in_date_only = check_in_date.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Test user check-in
            existing_log = await db.habit_logs.find_one({
                "habit_id": habit_id,
                "user_id": test_user_id,
                "date": check_in_date_only
            })
            
            if not existing_log:
                log_entry = {
                    "habit_id": habit_id,
                    "user_id": test_user_id,
                    "completed": True,
                    "notes": f"Day {day_offset + 1} check-in",
                    "date": check_in_date_only,
                    "logged_at": check_in_date
                }
                await db.habit_logs.insert_one(log_entry)
            
            # Partner check-in (for showing partner progress)
            if day_offset < 3:  # Partner checked in last 3 days
                existing_partner_log = await db.habit_logs.find_one({
                    "habit_id": habit_id,
                    "user_id": partner_id,
                    "date": check_in_date_only
                })
                
                if not existing_partner_log:
                    partner_log = {
                        "habit_id": habit_id,
                        "user_id": partner_id,
                        "completed": True,
                        "notes": "Partner check-in",
                        "date": check_in_date_only,
                        "logged_at": check_in_date
                    }
                    await db.habit_logs.insert_one(partner_log)
        
        print(f"  ✅ Created {min(streak_days, 7)} check-in logs for '{habit['habit_name']}'")
    
    client.close()
    
    print("\n" + "="*60)
    print("🎉 Test data populated successfully!")
    print("="*60)
    print(f"\n📊 Summary:")
    print(f"  • User: {test_user['email']}")
    print(f"  • Partner: {partner_email}")
    print(f"  • Partnership ID: {partnership_id}")
    print(f"  • Habits created: {len(created_habits)}")
    print(f"  • Total streaks: {sum(h['current_streak'] for h in created_habits)} days")
    print(f"\n💡 You can now log in with test@pact.com and see:")
    print(f"  ✅ 4 active habits with streaks")
    print(f"  ✅ Today's goals to check in")
    print(f"  ✅ Partner progress notifications")
    print(f"  ✅ Active partnership with 'Partner Friend'")

if __name__ == "__main__":
    asyncio.run(populate_test_data())
