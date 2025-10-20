# test_mongo_connection.py
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
import ssl
import os
from dotenv import load_dotenv

load_dotenv()


async def test_connection():
    try:
        url = os.getenv("MONGODB_URL")
        print(f"Testing connection to: {url[:50]}...")
        print(f"🔍 OpenSSL: {ssl.OPENSSL_VERSION}")

        # Try with tlsAllowInvalidCertificates as a test
        client = AsyncIOMotorClient(
            url,
            server_api=ServerApi('1'),
            tls=True,
            tlsAllowInvalidCertificates=True,  # TEMPORARY - just to test
            serverSelectionTimeoutMS=10000
        )

        await client.admin.command('ping')
        print("✅ Connection successful!")

        # Test database access
        db = client.get_database("pact")
        collections = await db.list_collection_names()
        print(f"📊 Available collections: {collections}")

        client.close()
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_connection())