
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")

client = None
database = None


async def connect_to_mongo():
    global client, database
    try:
        client = AsyncIOMotorClient(
            MONGODB_URL,
            server_api=ServerApi('1'),
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            socketTimeoutMS=10000
        )

        # Ping to verify connection
        await client.admin.command('ping')
        database = client.get_database("pact")
        print("✅ Connected to MongoDB successfully!")
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