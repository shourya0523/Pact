import asyncio
from config.database import connect_to_mongo, close_mongo_connection


async def init_database():
    try:
        db = await connect_to_mongo()

        # Create collections based on your ERD
        collections = [
            "users",
            "partnerships",
            "habits",
            "habit_logs",
            "notifications",
            "partner_requests",
            "milestones",
            "streak_history"
        ]

        existing_collections = await db.list_collection_names()

        for collection_name in collections:
            if collection_name not in existing_collections:
                await db.create_collection(collection_name)
                print(f"✅ Created collection: {collection_name}")
            else:
                print(f"⏭️  Collection already exists: {collection_name}")

        # Create indexes for performance
        print("\n📇 Creating indexes...")
        await db.users.create_index("email", unique=True)
        await db.users.create_index("username", unique=True)
        await db.partnerships.create_index([("user_id_1", 1), ("user_id_2", 1)])
        await db.habits.create_index("partnership_id")
        await db.habit_logs.create_index([("habit_id", 1), ("user_id", 1), ("date", 1)])
        await db.partner_requests.create_index("recipient_email")

        print("✅ All indexes created!")
        print("\n🎉 Database initialization complete!")

        await close_mongo_connection()

    except Exception as e:
        print(f"❌ Initialization failed: {e}")


if __name__ == "__main__":
    asyncio.run(init_database())