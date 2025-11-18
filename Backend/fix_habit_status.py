"""
Fix habit statuses to be 'active'
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def fix_habit_statuses():
    mongo_uri = os.getenv("MONGODB_URL")
    client = AsyncIOMotorClient(mongo_uri)
    db = client.pact
    
    # Update all habits to have status "active"
    result = await db.habits.update_many(
        {},  # All habits
        {"$set": {"status": "active"}}
    )
    
    print(f"✅ Updated {result.modified_count} habits to 'active' status")
    
    # Verify
    habits = await db.habits.find({"status": "active"}).to_list(100)
    print(f"\n📊 Total active habits: {len(habits)}")
    for habit in habits:
        print(f"  - {habit['habit_name']} (streak: {habit.get('current_streak', 0)})")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_habit_statuses())
