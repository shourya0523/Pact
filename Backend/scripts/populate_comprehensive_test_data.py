"""
Comprehensive test data population script
Creates multiple test users with real names, partnerships, habits, goals, and check-in history

Prerequisites:
1. Install dependencies: pip install -r requirements.txt
2. Set up .env file with MONGODB_URL or MONGODB_URI

Run from Backend directory: python3 scripts/populate_comprehensive_test_data.py
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path so we can import app modules
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

try:
    from motor.motor_asyncio import AsyncIOMotorClient
    from datetime import datetime, timedelta
    import os
    from dotenv import load_dotenv
    from bson import ObjectId
    from app.utils.security import hash_password
except ImportError as e:
    print("=" * 70)
    print("❌ MISSING DEPENDENCIES")
    print("=" * 70)
    print(f"\nError: {e}")
    print("\nPlease install dependencies first:")
    print("  cd Backend")
    print("  pip install -r requirements.txt")
    print("\nOr if using a virtual environment:")
    print("  python3 -m venv venv")
    print("  source venv/bin/activate  # On Windows: venv\\Scripts\\activate")
    print("  pip install -r requirements.txt")
    print("\nThen run this script again.")
    sys.exit(1)

# Load environment variables from Backend directory
env_path = backend_dir / '.env'
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()

# Test users with real names
TEST_USERS = [
    {
        "username": "alex_martinez",
        "email": "alex.martinez@test.com",
        "password": "Test123!",
        "display_name": "Alex Martinez",
        "profile_photo_url": ""
    },
    {
        "username": "sarah_johnson",
        "email": "sarah.johnson@test.com",
        "password": "Test123!",
        "display_name": "Sarah Johnson",
        "profile_photo_url": ""
    },
    {
        "username": "michael_chen",
        "email": "michael.chen@test.com",
        "password": "Test123!",
        "display_name": "Michael Chen",
        "profile_photo_url": ""
    },
    {
        "username": "emily_williams",
        "email": "emily.williams@test.com",
        "password": "Test123!",
        "display_name": "Emily Williams",
        "profile_photo_url": ""
    },
    {
        "username": "david_brown",
        "email": "david.brown@test.com",
        "password": "Test123!",
        "display_name": "David Brown",
        "profile_photo_url": ""
    }
]

# Partnerships to create (pairs of user indices)
PARTNERSHIPS = [
    (0, 1),  # Alex & Sarah
    (2, 3),  # Michael & Emily
    (1, 4),  # Sarah & David
]

# Habits for each partnership
HABITS_CONFIG = [
    {
        "habit_name": "Morning Workout",
        "habit_type": "build",
        "category": "fitness",
        "description": "Exercise for 30 minutes every morning",
        "frequency": "daily",
        "streak_days": 15
    },
    {
        "habit_name": "Read Daily",
        "habit_type": "build",
        "category": "learning",
        "description": "Read for at least 20 minutes",
        "frequency": "daily",
        "streak_days": 22
    },
    {
        "habit_name": "Meditation",
        "habit_type": "build",
        "category": "mindfulness",
        "description": "Practice meditation for 10 minutes",
        "frequency": "daily",
        "streak_days": 8
    },
    {
        "habit_name": "Drink Water",
        "habit_type": "build",
        "category": "health",
        "description": "Drink 8 glasses of water daily",
        "frequency": "daily",
        "streak_days": 30
    }
]

async def populate_comprehensive_test_data():
    # Get MongoDB connection
    mongo_uri = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
    if not mongo_uri:
        print("❌ MONGODB_URL or MONGODB_URI not found in environment")
        return
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client[os.getenv("DATABASE_NAME", "pact_db")]
    
    print("=" * 70)
    print("🚀 POPULATING COMPREHENSIVE TEST DATA")
    print("=" * 70)
    
    # Step 1: Create users
    print("\n📝 Step 1: Creating test users...")
    user_ids = []
    for user_data in TEST_USERS:
        existing_user = await db.users.find_one({"email": user_data["email"]})
        
        if existing_user:
            print(f"  ⚠️  User {user_data['display_name']} already exists")
            user_ids.append(str(existing_user["_id"]))
        else:
            user_dict = {
                "username": user_data["username"],
                "email": user_data["email"],
                "password": hash_password(user_data["password"]),
                "display_name": user_data["display_name"],
                "profile_photo_url": user_data["profile_photo_url"],
                "profile_completed": True,
                "is_active": True,
                "notification_preferences": {},
                "created_at": datetime.utcnow() - timedelta(days=60),  # Created 60 days ago
                "updated_at": datetime.utcnow()
            }
            
            result = await db.users.insert_one(user_dict)
            user_ids.append(str(result.inserted_id))
            print(f"  ✅ Created user: {user_data['display_name']} ({user_data['email']})")
    
    # Step 2: Create partnerships
    print("\n🤝 Step 2: Creating partnerships...")
    partnership_ids = []
    for idx, (user1_idx, user2_idx) in enumerate(PARTNERSHIPS):
        user1_id = ObjectId(user_ids[user1_idx])
        user2_id = ObjectId(user_ids[user2_idx])
        
        # Check if partnership exists
        existing = await db.partnerships.find_one({
            "$or": [
                {"user_id_1": user1_id, "user_id_2": user2_id},
                {"user_id_1": user2_id, "user_id_2": user1_id}
            ]
        })
        
        if existing:
            print(f"  ⚠️  Partnership {idx + 1} already exists")
            partnership_ids.append(str(existing["_id"]))
        else:
            partnership = {
                "user_id_1": user1_id,
                "user_id_2": user2_id,
                "status": "active",
                "created_at": datetime.utcnow() - timedelta(days=45),  # 45 days ago
                "updated_at": datetime.utcnow()
            }
            
            result = await db.partnerships.insert_one(partnership)
            partnership_id = str(result.inserted_id)
            partnership_ids.append(partnership_id)
            
            user1_name = TEST_USERS[user1_idx]["display_name"]
            user2_name = TEST_USERS[user2_idx]["display_name"]
            print(f"  ✅ Created partnership: {user1_name} & {user2_name}")
    
    # Step 3: Create habits and goals
    print("\n🎯 Step 3: Creating habits and goals...")
    all_habits = []
    
    for partnership_idx, partnership_id in enumerate(partnership_ids):
        user1_idx, user2_idx = PARTNERSHIPS[partnership_idx]
        user1_id = user_ids[user1_idx]
        user2_id = user_ids[user2_idx]
        
        for habit_config in HABITS_CONFIG:
            # Check if habit exists
            existing_habit = await db.habits.find_one({
                "partnership_id": partnership_id,
                "habit_name": habit_config["habit_name"]
            })
            
            if existing_habit:
                print(f"  ⚠️  Habit '{habit_config['habit_name']}' already exists for partnership {partnership_idx + 1}")
                all_habits.append(existing_habit)
                continue
            
            # Create habit
            habit = {
                "habit_name": habit_config["habit_name"],
                "habit_type": habit_config["habit_type"],
                "category": habit_config["category"],
                "description": habit_config["description"],
                "frequency": habit_config["frequency"],
                "partnership_id": partnership_id,
                "created_by": user1_id,
                "status": "active",
                "count_checkins": 0,
                "current_streak": habit_config["streak_days"],
                "longest_streak": habit_config["streak_days"],
                "created_at": datetime.utcnow() - timedelta(days=habit_config["streak_days"]),
                "updated_at": datetime.utcnow(),
                "goals": {}  # Will be populated below
            }
            
            result = await db.habits.insert_one(habit)
            habit_id = str(result.inserted_id)
            habit["_id"] = result.inserted_id
            
            # Create goals for both users
            goals = {}
            
            # User 1 goal (frequency type)
            goal1 = {
                "goal_type": "frequency",
                "goal_name": f"{habit_config['habit_name']} - Daily",
                "frequency_count": 1,
                "frequency_unit": "day",
                "duration_count": 30,
                "duration_unit": "day",
                "goal_progress": min(habit_config["streak_days"], 30),
                "count_checkins": habit_config["streak_days"],
                "checked_in": False,
                "goal_start_date": datetime.utcnow() - timedelta(days=habit_config["streak_days"]),
                "goal_end_date": datetime.utcnow() + timedelta(days=30 - habit_config["streak_days"]),
                "goal_status": "active",
                "created_at": datetime.utcnow() - timedelta(days=habit_config["streak_days"]),
                "updated_at": datetime.utcnow()
            }
            goals[user1_id] = goal1
            
            # User 2 goal (slightly different progress)
            user2_streak = max(1, habit_config["streak_days"] - 3)  # Partner has slightly fewer check-ins
            goal2 = {
                "goal_type": "frequency",
                "goal_name": f"{habit_config['habit_name']} - Daily",
                "frequency_count": 1,
                "frequency_unit": "day",
                "duration_count": 30,
                "duration_unit": "day",
                "goal_progress": min(user2_streak, 30),
                "count_checkins": user2_streak,
                "checked_in": False,
                "goal_start_date": datetime.utcnow() - timedelta(days=user2_streak),
                "goal_end_date": datetime.utcnow() + timedelta(days=30 - user2_streak),
                "goal_status": "active",
                "created_at": datetime.utcnow() - timedelta(days=user2_streak),
                "updated_at": datetime.utcnow()
            }
            goals[user2_id] = goal2
            
            # Update habit with goals
            await db.habits.update_one(
                {"_id": result.inserted_id},
                {"$set": {"goals": goals}}
            )
            
            habit["goals"] = goals
            all_habits.append(habit)
            
            user1_name = TEST_USERS[user1_idx]["display_name"]
            user2_name = TEST_USERS[user2_idx]["display_name"]
            print(f"  ✅ Created habit '{habit_config['habit_name']}' for {user1_name} & {user2_name}")
    
    # Step 4: Create check-in history
    print("\n📅 Step 4: Creating check-in history...")
    total_logs = 0
    
    for habit in all_habits:
        habit_id = str(habit["_id"])
        partnership_id = habit["partnership_id"]
        
        # Get user IDs from goals
        user_ids_in_habit = list(habit.get("goals", {}).keys())
        if not user_ids_in_habit:
            continue
        
        streak_days = habit.get("current_streak", 0)
        
        # Create check-ins for the last streak_days days
        for day_offset in range(streak_days):
            check_in_date = datetime.utcnow() - timedelta(days=day_offset)
            check_in_date_only = check_in_date.replace(hour=8 + (day_offset % 12), minute=0, second=0, microsecond=0)
            
            for user_id in user_ids_in_habit:
                # Check if log already exists
                existing_log = await db.habit_logs.find_one({
                    "habit_id": ObjectId(habit_id),
                    "user_id": ObjectId(user_id),
                    "log_date": check_in_date_only
                })
                
                if not existing_log:
                    log_entry = {
                        "habit_id": ObjectId(habit_id),
                        "user_id": ObjectId(user_id),
                        "completed": True,
                        "notes": f"Day {day_offset + 1} check-in",
                        "log_date": check_in_date_only,
                        "timestamp": check_in_date_only,
                        "logged_at": check_in_date_only
                    }
                    await db.habit_logs.insert_one(log_entry)
                    total_logs += 1
        
        print(f"  ✅ Created {streak_days * len(user_ids_in_habit)} check-in logs for '{habit['habit_name']}'")
    
    # Step 5: Create README with login credentials
    print("\n📄 Step 5: Creating README file...")
    readme_content = """# Test User Credentials

This file contains login credentials for test users created by `populate_comprehensive_test_data.py`.

## Test Users

"""
    
    for user in TEST_USERS:
        readme_content += f"""### {user['display_name']}
- **Username:** `{user['username']}`
- **Email:** `{user['email']}`
- **Password:** `{user['password']}`
- **Display Name:** {user['display_name']}

"""
    
    readme_content += """## Partnerships

"""
    for idx, (user1_idx, user2_idx) in enumerate(PARTNERSHIPS):
        user1 = TEST_USERS[user1_idx]
        user2 = TEST_USERS[user2_idx]
        readme_content += f"{idx + 1}. **{user1['display_name']}** & **{user2['display_name']}**\n"
    
    readme_content += f"""
## Test Data Summary

- **Total Users:** {len(TEST_USERS)}
- **Total Partnerships:** {len(PARTNERSHIPS)}
- **Total Habits:** {len(all_habits)}
- **Total Check-in Logs:** {total_logs}

## Habits Created

"""
    for habit_config in HABITS_CONFIG:
        readme_content += f"- **{habit_config['habit_name']}** ({habit_config['category']}) - {habit_config['streak_days']} day streak\n"
    
    readme_content += """
## Notes

- All users have the same password: `Test123!`
- All partnerships are active
- All habits have goals set for both partners
- Check-in history spans the last 8-30 days depending on the habit
- Users have varying streak lengths to show different progress states

## Usage

You can log in with any of the test user credentials above to test the application features including:
- Viewing partnerships
- Checking habit progress
- Viewing check-in history
- Testing goal tracking
- Testing notifications
"""
    
    readme_path = os.path.join(os.path.dirname(__file__), "..", "TEST_USERS_README.md")
    with open(readme_path, "w") as f:
        f.write(readme_content)
    
    print(f"  ✅ Created README at: {readme_path}")
    
    # Summary
    print("\n" + "=" * 70)
    print("🎉 COMPREHENSIVE TEST DATA POPULATED SUCCESSFULLY!")
    print("=" * 70)
    print(f"\n📊 Summary:")
    print(f"  • Users created: {len(TEST_USERS)}")
    print(f"  • Partnerships created: {len(partnership_ids)}")
    print(f"  • Habits created: {len(all_habits)}")
    print(f"  • Check-in logs created: {total_logs}")
    print(f"\n📄 Login credentials saved to: TEST_USERS_README.md")
    print(f"\n💡 You can now log in with any test user to explore the app!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(populate_comprehensive_test_data())

