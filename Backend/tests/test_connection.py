import pytest
import asyncio
import sys
from pathlib import Path

# Add the Backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from config.database import connect_to_mongo, close_mongo_connection

@pytest.mark.asyncio
async def test_connection():
    try:
        db = await connect_to_mongo()
        print(f"Database name: {db.name}")

        # List existing collections
        collections = await db.list_collection_names()
        print(f"Existing collections: {collections}")

        await close_mongo_connection()

    except Exception as e:
        print(f"Connection test failed: {e}")


if __name__ == "__main__":
    asyncio.run(test_connection())