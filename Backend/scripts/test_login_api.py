"""
Test login directly via command line
"""
import requests
import json

BASE_URL = "http://localhost:8000"

print("=" * 50)
print("Testing Login API")
print("=" * 50)

# Test credentials
email = "test1@pact.com"
password = "password123"

print(f"\n📧 Email: {email}")
print(f"🔑 Password: {password}")
print(f"\n🔗 Testing endpoint: {BASE_URL}/api/auth/login")

try:
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": email,
            "password": password
        },
        headers={"Content-Type": "application/json"}
    )
    
    print(f"\n📊 Response Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("\n✅ LOGIN SUCCESSFUL!")
        print(f"   Token: {data['access_token'][:50]}...")
        print(f"   User: {data['user']['username']}")
        print(f"   Email: {data['user']['email']}")
    else:
        print("\n❌ LOGIN FAILED!")
        print(f"   Error: {response.json()}")
        
except requests.exceptions.ConnectionError:
    print("\n❌ CONNECTION ERROR!")
    print("   Backend is not running at http://localhost:8000")
    print("   Start it with: python3 -m uvicorn main:app --reload")
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")

print("\n" + "=" * 50)
