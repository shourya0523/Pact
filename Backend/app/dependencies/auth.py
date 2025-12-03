from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.security import decode_access_token
from config.database import get_database
from bson import ObjectId
from typing import Optional

security = HTTPBearer()


async def get_current_user_id(
        credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Dependency to get current authenticated user's ID from JWT token
    Raises 401 if token is invalid
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id


async def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Dependency to get full current user object from database
    Raises 401 if token invalid, 404 if user not found
    """
    print(f"🔐 get_current_user called")
    token = credentials.credentials
    print(f"   Token: {token[:20]}...")
    payload = decode_access_token(token)

    if payload is None:
        print("   ❌ Token decode failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    print(f"   User ID from token: {user_id}")

    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})

    if user is None:
        print(f"   ❌ User not found in DB")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    print(f"   ✅ User found: {user.get('username')}")
    print(f"   is_active: {user.get('is_active', 'NOT SET')}")
    
    if not user.get("is_active", True):
        print(f"   ❌ User is not active! Returning 403")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    print(f"   ✅ Auth successful for: {user.get('username')}")
    return user


async def get_optional_user_id(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    """
    Optional authentication - returns user_id if authenticated, None otherwise
    Useful for endpoints that work with or without auth
    """
    if credentials is None:
        return None

    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        return None

    return payload.get("sub")