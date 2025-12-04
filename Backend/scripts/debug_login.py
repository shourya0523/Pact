"""
Debug login issue - check everything
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

async def debug_login():
    print("=" * 60)
    print("DEBUGGING LOGIN ISSUE")
    print("=" * 60)
    
    # Check all users
    print("\n1. Checking all users in database:")
    users = await db.users.find().to_list(100)
    print(f"   Total users found: {len(users)}")
    
    for i, user in enumerate(users, 1):
        print(f"\n   User {i}:")
        print(f"   - Username: {user.get('username')}")
        print(f"   - Email: {user.get('email')}")
        print(f"   - ID: {str(user['_id'])}")
        print(f"   - Has password: {'Yes' if user.get('password') else 'No'}")
        
        # Test password for test1@pact.com
        if user.get('email') == 'test1@pact.com':
            print(f"\n   🔐 Testing password for test1@pact.com:")
            test_password = "password123"
            hashed = user.get('password')
            
            if hashed:
                is_valid = pwd_context.verify(test_password, hashed)
                if is_valid:
                    print(f"   ✅ Password 'password123' is CORRECT!")
                else:
                    print(f"   ❌ Password 'password123' is WRONG!")
                    print(f"   Hash starts with: {hashed[:60]}...")
                    
                    # Try verifying with the hash function to see if it's even a valid hash
                    try:
                        pwd_context.verify("test", hashed)
                    except Exception as e:
                        print(f"   ⚠️  Hash verification error: {e}")
            else:
                print(f"   ❌ No password hash found!")
    
    # Check what the backend expects
    print("\n2. Backend configuration:")
    print(f"   DATABASE_NAME: {os.getenv('DATABASE_NAME', 'pact_db')}")
    print(f"   MONGODB_URI: {MONGO_URI[:50]}...")
    
    print("\n" + "=" * 60)
    print("RECOMMENDATIONS:")
    print("=" * 60)
    
    if len(users) == 0:
        print("❌ No users found! Run: python3 scripts/create_test_users.py")
    else:
        test_user = next((u for u in users if u.get('email') == 'test1@pact.com'), None)
        if not test_user:
            print("❌ test1@pact.com not found! Run: python3 scripts/create_test_users.py")
        else:
            print("✅ test1@pact.com exists")
            if pwd_context.verify("password123", test_user.get('password', '')):
                print("✅ Password is correct")
                print("\n🤔 If login still fails, the issue is in the frontend:")
                print("   1. Clear browser cache (hard refresh)")
                print("   2. Check browser console for errors")
                print("   3. Make sure frontend code has latest changes")
            else:
                print("❌ Password is wrong - recreate user")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(debug_login())
