import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def clear_logs():
    client = AsyncIOMotorClient(os.getenv('MONGODB_URI'))
    db = client[os.getenv('DATABASE_NAME', 'pact_db')]
    result = await db.habit_logs.delete_many({})
    print(f'✅ Deleted {result.deleted_count} habit_logs')
    client.close()

asyncio.run(clear_logs())
