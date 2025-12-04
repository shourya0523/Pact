"""
Verify test users and test login
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client[os.getenv("DATABASE_NAME", "pact_db")]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def verify_login():
    print("Testing login credentials...\n")
    
    # Try to find test user
    user = await db.users.find_one({"email": "test1@pact.com"})
    
    if not user:
        print("❌ User test1@pact.com not found!")
        client.close()
        return
    
    print(f"✅ Found user: {user.get('username')}")
    print(f"   Email: {user.get('email')}")
    print(f"   ID: {str(user['_id'])}")
    
    # Test password
    test_password = "password123"
    hashed = user.get('password')
    
    print(f"\n🔐 Testing password: '{test_password}'")
    
    is_valid = pwd_context.verify(test_password, hashed)
    
    if is_valid:
        print("✅ Password is CORRECT!")
        print("\n📝 Login Credentials:")
        print("   Email: test1@pact.com")
        print("   Password: password123")
    else:
        print("❌ Password is WRONG!")
        print("   Stored hash:", hashed[:50] + "...")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(verify_login())
