"""
Check if test users from populate_comprehensive_test_data.py exist
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
if not MONGO_URI:
    print("❌ MONGODB_URL or MONGODB_URI not found in environment")
    exit(1)

client = AsyncIOMotorClient(MONGO_URI)
db = client[os.getenv("DATABASE_NAME", "pact_db")]

TEST_USER_EMAILS = [
    "alex.martinez@test.com",
    "sarah.johnson@test.com",
    "michael.chen@test.com",
    "emily.williams@test.com",
    "david.brown@test.com"
]

async def check_test_users():
    print("=" * 70)
    print("🔍 CHECKING TEST USERS")
    print("=" * 70)
    print(f"\nDatabase: {db.name}")
    print(f"MongoDB URI: {MONGO_URI[:50]}...\n")
    
    found_count = 0
    missing_count = 0
    
    for email in TEST_USER_EMAILS:
        user = await db.users.find_one({"email": email})
        if user:
            print(f"✅ Found: {email} (username: {user.get('username', 'N/A')})")
            found_count += 1
        else:
            print(f"❌ Missing: {email}")
            missing_count += 1
    
    print("\n" + "=" * 70)
    print(f"Summary: {found_count} found, {missing_count} missing")
    print("=" * 70)
    
    if missing_count > 0:
        print("\n💡 To create missing users, run:")
        print("   python3 scripts/populate_comprehensive_test_data.py")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_test_users())

