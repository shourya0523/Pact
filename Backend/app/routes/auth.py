from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.user import UserCreate, UserLogin, UserResponse, User
from app.utils.security import hash_password, verify_password, create_access_token, decode_access_token
from config.database import get_database
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate):
    db = get_database()

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

    # Create new user
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user_dict["password"])
    user_dict["created_at"] = datetime.utcnow()
    user_dict["notification_preferences"] = {}
    user_dict["is_active"] = True

    result = await db.users.insert_one(user_dict)

    # Get the created user
    created_user = await db.users.find_one({"_id": result.inserted_id})

    return UserResponse(
        id=str(created_user["_id"]),
        username=created_user["username"],
        email=created_user["email"],
        created_at=created_user["created_at"]
    )


@router.post("/login")
async def login(credentials: UserLogin):
    db = get_database()

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
            created_at=user["created_at"]
        )
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    db = get_database()
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
async def test_login(user_number: int):
    """
    Quick test login(mainly for partnership)

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