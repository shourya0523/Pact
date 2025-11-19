from bson import ObjectId
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import UserCreate, UserLogin, UserResponse, User
from app.utils.security import hash_password, verify_password, create_access_token, decode_access_token
from config.database import get_database
from datetime import datetime
from pydantic import BaseModel
import httpx

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    user: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Create new user account.
    
    After signup, user must complete profile setup via POST /users/me/profile-setup
    Returns user with profile_completed=False
    """
    # Check if user already exists
    existing_user = await db.users.find_one({"$or": [
        {"email": user.email},
        {"username": user.username}
    ]})

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists"
        )

    # Create new user with profile fields as empty/incomplete
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user_dict["password"])
    user_dict["created_at"] = datetime.utcnow()
    user_dict["updated_at"] = datetime.utcnow()
    user_dict["notification_preferences"] = {}
    user_dict["is_active"] = True
    
    # Profile setup fields - start empty
    user_dict["display_name"] = ""
    user_dict["profile_photo_url"] = ""
    user_dict["profile_completed"] = False

    result = await db.users.insert_one(user_dict)

    # Get the created user
    created_user = await db.users.find_one({"_id": result.inserted_id})

    return UserResponse(
        id=str(created_user["_id"]),
        username=created_user["username"],
        email=created_user["email"],
        display_name=created_user["display_name"],
        profile_photo_url=created_user["profile_photo_url"],
        profile_completed=created_user["profile_completed"],
        created_at=created_user["created_at"]
    )


@router.post("/login")
async def login(
    credentials: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Login user and return access token.
    
    Returns profile_completed flag so frontend can route to profile setup if needed.
    """
    # Find user by email
    user = await db.users.find_one({"email": credentials.email})

    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Create access token
    access_token = create_access_token(
        data={"sub": str(user["_id"]), "email": user["email"]}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=str(user["_id"]),
            username=user["username"],
            email=user["email"],
            display_name=user.get("display_name", ""),
            profile_photo_url=user.get("profile_photo_url", ""),
            profile_completed=user.get("profile_completed", False),
            created_at=user["created_at"]
        )
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get current authenticated user's profile"""
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    user_id = payload.get("sub")
    user = await db.users.find_one({"_id": ObjectId(user_id)})

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        email=user["email"],
        display_name=user.get("display_name", ""),
        profile_photo_url=user.get("profile_photo_url", ""),
        profile_completed=user.get("profile_completed", False),
        created_at=user["created_at"]
    )


@router.post("/test-login", include_in_schema=False)
async def test_login():
    """
    Development only - returns test user credentials and token
    Hidden from API docs - remove in production!
    """
    # Fixed test user IDs (use valid MongoDB ObjectId format)
    test_user = {
        "user_id": "507f1f77bcf86cd799439011",
        "email": "test@example.com",
        "username": "testuser"
    }

    # Generate JWT token for test user
    access_token = create_access_token(data={"sub": test_user["user_id"]})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": test_user["user_id"],
            "email": test_user["email"],
            "username": test_user["username"]
        },
        "message": "⚠️ Test credentials - for development only"
    }


@router.post("/test-login/{user_number}", tags=["Testing"])
async def test_login_numbered(user_number: int):
    """
    Quick test login (mainly for partnership testing)

    These users have a pre-existing partnership for testing.
    """
    test_users = {
        1: {
            "user_id": "507f1f77bcf86cd799439011",
            "email": "sohum@test.com",
            "username": "alice",
            "partnership_id": "507f1f77bcf86cd799439020"
        },
        2: {
            "user_id": "507f1f77bcf86cd799439012",
            "email": "krishna@test.com",
            "username": "bob",
            "partnership_id": "507f1f77bcf86cd799439020"
        }
    }

    if user_number not in test_users:
        raise HTTPException(status_code=400, detail="Use 1 or 2")

    test_user = test_users[user_number]
    access_token = create_access_token(data={"sub": test_user["user_id"]})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "partnership_id": test_user["partnership_id"]
    }


class GoogleAuthRequest(BaseModel):
    token: str


@router.post("/google")
async def google_login(
    auth_data: GoogleAuthRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Handle Google OAuth login
    Verifies Google token and creates/logs in user
    """
    try:
        # Verify Google token and get user info
        async with httpx.AsyncClient() as client:
            google_response = await client.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {auth_data.token}'}
            )
        
        if google_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token"
            )
        
        google_user = google_response.json()
        email = google_user.get('email')
        name = google_user.get('name', '')
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google"
            )
        
        # Check if user exists
        user = await db.users.find_one({"email": email})
        
        if not user:
            # Create new user
            username = email.split('@')[0]  # Simple username from email
            new_user = {
                "username": username,
                "email": email,
                "password": hash_password(auth_data.token[:20]),  # Dummy password
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "notification_preferences": {},
                "is_active": True,
                "display_name": name,
                "profile_photo_url": google_user.get('picture', ''),
                "profile_completed": False
            }
            
            result = await db.users.insert_one(new_user)
            user = await db.users.find_one({"_id": result.inserted_id})
        
        # Create access token
        access_token = create_access_token(
            data={"sub": str(user["_id"]), "email": user["email"]}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse(
                id=str(user["_id"]),
                username=user["username"],
                email=user["email"],
                display_name=user.get("display_name", ""),
                profile_photo_url=user.get("profile_photo_url", ""),
                profile_completed=user.get("profile_completed", False),
                created_at=user["created_at"]
            )
        }
    
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not verify Google authentication"
        )