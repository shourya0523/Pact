from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")

# Debug: Check if .env is loaded
print(f"🔍 MONGODB_URL loaded: {MONGODB_URL is not None}")
if MONGODB_URL:
    # Print just the connection string structure without showing the password
    print(f"🔍 Connection string starts with: {MONGODB_URL[:20]}...")

client = None
database = None

async def connect_to_mongo():
    global client, database
    try:
        client = AsyncIOMotorClient(MONGODB_URL, server_api=ServerApi('1'))
        # Ping to verify connection
        await client.admin.command('ping')
        database = client.get_database("pact")
        print("✅ Connected to MongoDB successfully!")
        return database
    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {e}")
        raise e

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")

def get_database():
    return database