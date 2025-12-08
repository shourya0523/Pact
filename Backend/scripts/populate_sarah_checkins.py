"""
Script to populate check-in data for Sarah Johnson
Creates varied check-in patterns to test the progress visualization feature

Run from Backend directory: python3 scripts/populate_sarah_checkins.py
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
    import random
except ImportError as e:
    print("=" * 70)
    print("❌ MISSING DEPENDENCIES")
    print("=" * 70)
    print(f"\nError: {e}")
    print("\nPlease install dependencies first:")
    print("  cd Backend")
    print("  pip install -r requirements.txt")
    sys.exit(1)

# Load environment variables
env_path = backend_dir / '.env'
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()

async def populate_sarah_checkins():
    """Populate check-in data for Sarah Johnson with varied patterns"""
    
    # Get MongoDB connection
    mongo_uri = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
    if not mongo_uri:
        print("❌ MONGODB_URL or MONGODB_URI not found in environment")
        return
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client[os.getenv("DATABASE_NAME", "pact_db")]
    
    print("=" * 70)
    print("🚀 POPULATING CHECK-IN DATA FOR SARAH JOHNSON")
    print("=" * 70)
    
    # Step 1: Find Sarah Johnson
    print("\n👤 Step 1: Finding Sarah Johnson...")
    sarah = await db.users.find_one({"email": "sarah.johnson@test.com"})
    
    if not sarah:
        print("  ❌ Sarah Johnson not found. Please run populate_comprehensive_test_data.py first.")
        client.close()
        return
    
    sarah_id = str(sarah["_id"])
    print(f"  ✅ Found Sarah Johnson: {sarah.get('display_name')} ({sarah_id})")
    
    # Step 2: Find or create habits for Sarah
    print("\n📋 Step 2: Finding habits for Sarah...")
    
    # Find partnerships Sarah is in
    partnerships = await db.partnerships.find({
        "$or": [
            {"user_id_1": ObjectId(sarah_id)},
            {"user_id_2": ObjectId(sarah_id)}
        ],
        "status": "active"
    }).to_list(length=None)
    
    if not partnerships:
        print("  ⚠️  No partnerships found for Sarah. Creating test data...")
        client.close()
        return
    
    partnership_ids = [str(p["_id"]) for p in partnerships]
    
    # Find habits for these partnerships
    habits = await db.habits.find({
        "partnership_id": {"$in": partnership_ids},
        "status": "active"
    }).to_list(length=None)
    
    if not habits:
        print("  ⚠️  No habits found for Sarah's partnerships.")
        client.close()
        return
    
    # Filter habits that have goals for Sarah
    sarah_habits = []
    for habit in habits:
        goals = habit.get("goals", {})
        if sarah_id in goals:
            sarah_habits.append(habit)
    
    if not sarah_habits:
        print("  ⚠️  No habits with goals found for Sarah.")
        client.close()
        return
    
    print(f"  ✅ Found {len(sarah_habits)} habit(s) with goals for Sarah")
    
    # Step 3: Clear existing check-ins for Sarah (optional - comment out if you want to keep existing)
    print("\n🗑️  Step 3: Clearing existing check-ins for Sarah...")
    result = await db.habit_logs.delete_many({"user_id": sarah_id})
    print(f"  ✅ Deleted {result.deleted_count} existing check-in logs")
    
    # Step 4: Create varied check-in patterns
    print("\n📅 Step 4: Creating varied check-in patterns...")
    
    total_logs = 0
    
    for idx, habit in enumerate(sarah_habits):
        habit_id = str(habit["_id"])
        habit_name = habit["habit_name"]
        goal = habit.get("goals", {}).get(sarah_id, {})
        goal_type = goal.get("goal_type", "frequency")
        target_value = goal.get("target_value")
        
        print(f"\n  📊 Habit: {habit_name}")
        print(f"     Goal Type: {goal_type}")
        
        # Create different patterns for different habits
        if idx == 0:
            # Pattern 1: Recent daily check-ins (last 14 days) - for daily view
            print("     Pattern: Recent daily (14 days)")
            days = 14
            for day_offset in range(days):
                check_in_date = datetime.utcnow() - timedelta(days=day_offset)
                check_in_date = check_in_date.replace(hour=9, minute=0, second=0, microsecond=0)
                
                value = None
                if goal_type == "completion" and target_value:
                    # Random value between 1 and target_value/14 per day
                    value = round(random.uniform(1, target_value / 14), 2)
                
                log_entry = {
                    "habit_id": ObjectId(habit_id),
                    "user_id": ObjectId(sarah_id),
                    "completed": True,
                    "log_date": check_in_date,
                    "timestamp": check_in_date,
                    "value": value
                }
                await db.habit_logs.insert_one(log_entry)
                total_logs += 1
        
        elif idx == 1:
            # Pattern 2: Weekly pattern (last 8 weeks) - for weekly view
            print("     Pattern: Weekly (8 weeks, 3-4 check-ins per week)")
            weeks = 8
            for week in range(weeks):
                # 3-4 check-ins per week
                checkins_per_week = random.randint(3, 4)
                for checkin in range(checkins_per_week):
                    day_in_week = random.randint(0, 6)
                    check_in_date = datetime.utcnow() - timedelta(weeks=week, days=day_in_week)
                    check_in_date = check_in_date.replace(hour=10 + checkin, minute=0, second=0, microsecond=0)
                    
                    value = None
                    if goal_type == "completion" and target_value:
                        value = round(random.uniform(1, target_value / (weeks * 3)), 2)
                    
                    log_entry = {
                        "habit_id": ObjectId(habit_id),
                        "user_id": ObjectId(sarah_id),
                        "completed": True,
                        "log_date": check_in_date,
                        "timestamp": check_in_date,
                        "value": value
                    }
                    await db.habit_logs.insert_one(log_entry)
                    total_logs += 1
        
        elif idx == 2:
            # Pattern 3: Monthly pattern (last 3 months) - for monthly view
            print("     Pattern: Monthly (3 months, 8-12 check-ins per month)")
            months = 3
            for month in range(months):
                checkins_per_month = random.randint(8, 12)
                for checkin in range(checkins_per_month):
                    day_in_month = random.randint(1, 28)
                    check_in_date = datetime.utcnow() - timedelta(days=month * 30 + day_in_month)
                    check_in_date = check_in_date.replace(hour=11 + (checkin % 8), minute=0, second=0, microsecond=0)
                    
                    value = None
                    if goal_type == "completion" and target_value:
                        value = round(random.uniform(1, target_value / (months * 10)), 2)
                    
                    log_entry = {
                        "habit_id": ObjectId(habit_id),
                        "user_id": ObjectId(sarah_id),
                        "completed": True,
                        "log_date": check_in_date,
                        "timestamp": check_in_date,
                        "value": value
                    }
                    await db.habit_logs.insert_one(log_entry)
                    total_logs += 1
        
        else:
            # Pattern 4: Sparse pattern (few check-ins over long period)
            print("     Pattern: Sparse (few check-ins over 60 days)")
            days = 60
            checkins_count = random.randint(8, 15)
            for _ in range(checkins_count):
                day_offset = random.randint(0, days)
                check_in_date = datetime.utcnow() - timedelta(days=day_offset)
                check_in_date = check_in_date.replace(hour=random.randint(8, 18), minute=0, second=0, microsecond=0)
                
                value = None
                if goal_type == "completion" and target_value:
                    value = round(random.uniform(1, target_value / checkins_count), 2)
                
                log_entry = {
                    "habit_id": ObjectId(habit_id),
                    "user_id": ObjectId(sarah_id),
                    "completed": True,
                    "log_date": check_in_date,
                    "timestamp": check_in_date,
                    "value": value
                }
                await db.habit_logs.insert_one(log_entry)
                total_logs += 1
        
        print(f"     ✅ Created check-ins for '{habit_name}'")
    
    # Step 5: Update goal progress based on check-ins
    print("\n🔄 Step 5: Updating goal progress...")
    
    for habit in sarah_habits:
        habit_id = str(habit["_id"])
        goal = habit.get("goals", {}).get(sarah_id, {})
        goal_type = goal.get("goal_type", "frequency")
        target_value = goal.get("target_value")
        
        # Get all check-ins for this habit
        logs = await db.habit_logs.find({
            "habit_id": ObjectId(habit_id),
            "user_id": ObjectId(sarah_id),
            "completed": True
        }).to_list(length=None)
        
        if goal_type == "completion" and target_value is not None:
            # Sum values for completion goals
            accumulated_value = sum(log.get("value", 0) or 0 for log in logs)
            count_checkins = len(logs)
            
            updates = {
                f"goals.{sarah_id}.count_checkins": count_checkins,
                f"goals.{sarah_id}.goal_progress": accumulated_value,
                f"goals.{sarah_id}.updated_at": datetime.utcnow()
            }
            
            if accumulated_value >= target_value:
                updates[f"goals.{sarah_id}.goal_status"] = "completed"
        else:
            # Count check-ins for frequency goals
            count_checkins = len(logs)
            updates = {
                f"goals.{sarah_id}.count_checkins": count_checkins,
                f"goals.{sarah_id}.goal_progress": count_checkins,
                f"goals.{sarah_id}.updated_at": datetime.utcnow()
            }
        
        await db.habits.update_one(
            {"_id": ObjectId(habit_id)},
            {"$set": updates}
        )
    
    print("  ✅ Updated goal progress for all habits")
    
    # Summary
    print("\n" + "=" * 70)
    print("🎉 CHECK-IN DATA POPULATED SUCCESSFULLY!")
    print("=" * 70)
    print(f"\n📊 Summary:")
    print(f"  • User: Sarah Johnson ({sarah_id})")
    print(f"  • Habits processed: {len(sarah_habits)}")
    print(f"  • Total check-in logs created: {total_logs}")
    print(f"\n💡 You can now log in as Sarah Johnson to view the progress visualization!")
    print(f"   Email: sarah.johnson@test.com")
    print(f"   Password: Test123!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(populate_sarah_checkins())

