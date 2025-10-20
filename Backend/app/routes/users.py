from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.user import UserResponse
from app.utils.security import decode_access_token
from config.database import get_database
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MessageResponse(BaseModel):
    message: str

# Create the router
router = APIRouter(prefix="/users", tags=["Users"])
security = HTTPBearer()


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    profile_photo_url: Optional[str] = None
    phone_number: Optional[str] = None


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    # 1. Get the JWT token
    token = credentials.credentials
    
    # 2. Decode the token to get user info
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 3. Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 4. Connect to database
    db = get_database()
    
    # 5. Find the user
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 6. Prepare update data (only include fields that are provided)
    update_data = {}
    if user_update.display_name is not None:
        update_data["display_name"] = user_update.display_name
    if user_update.bio is not None:
        update_data["bio"] = user_update.bio
    if user_update.profile_photo_url is not None:
        update_data["profile_photo_url"] = user_update.profile_photo_url
    if user_update.phone_number is not None:
        update_data["phone_number"] = user_update.phone_number
    
    # Add updated timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    # 7. Update the user in database
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    # 8. Get updated user
    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    # 9. Return the updated user
    return UserResponse(
        id=str(updated_user["_id"]),
        username=updated_user["username"],
        email=updated_user["email"],
        created_at=updated_user["created_at"]
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get current user profile"""
    # 1. Get the JWT token
    token = credentials.credentials
    
    # 2. Decode the token to get user info
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 3. Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 4. Connect to database
    db = get_database()
    
    # 5. Find the user
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 6. Return the user
    return UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        email=user["email"],
        created_at=user["created_at"]
    )


@router.delete("/me", response_model=MessageResponse)
async def delete_user_account(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete current user account"""
    # 1. Get the JWT token
    token = credentials.credentials
    
    # 2. Decode the token to get user info
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 3. Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 4. Connect to database
    db = get_database()
    
    # 5. Find the user
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 6. Soft delete - mark as inactive instead of actually deleting
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": False, "deleted_at": datetime.utcnow()}}
    )
    
    return MessageResponse(message="User account deleted successfully")


@router.get("/me/partnerships")
async def get_user_partnerships(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get user's partnership status"""
    # 1. Get the JWT token
    token = credentials.credentials
    
    # 2. Decode the token to get user info
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 3. Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 4. Connect to database
    db = get_database()
    
    # 5. Find user's partnerships
    partnerships = await db.partnerships.find({
        "$or": [
            {"user1_id": ObjectId(user_id)},
            {"user2_id": ObjectId(user_id)}
        ],
        "status": "active"
    }).to_list(length=None)
    
    # 6. Return partnerships
    return {
        "partnerships": [
            {
                "id": str(partnership["_id"]),
                "partner_id": str(partnership["user1_id"] if str(partnership["user2_id"]) == user_id else partnership["user2_id"]),
                "status": partnership["status"],
                "created_at": partnership["created_at"]
            }
            for partnership in partnerships
        ],
        "total_partnerships": len(partnerships)
    }


@router.get("/me/notifications")
async def get_notification_preferences(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get user's notification preferences"""
    # 1. Get the JWT token
    token = credentials.credentials
    
    # 2. Decode the token to get user info
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 3. Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 4. Connect to database
    db = get_database()
    
    # 5. Find the user
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 6. Return notification preferences
    return {
        "notification_preferences": user.get("notification_preferences", {}),
        "email_notifications": user.get("email_notifications", True),
        "push_notifications": user.get("push_notifications", True)
    }


class NotificationPreferencesUpdate(BaseModel):
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    notification_preferences: Optional[dict] = None


@router.put("/me/notifications", response_model=MessageResponse)
async def update_notification_preferences(
    preferences: NotificationPreferencesUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update user's notification preferences"""
    # 1. Get the JWT token
    token = credentials.credentials
    
    # 2. Decode the token to get user info
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 3. Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # 4. Connect to database
    db = get_database()
    
    # 5. Find the user
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 6. Prepare update data
    update_data = {}
    if preferences.email_notifications is not None:
        update_data["email_notifications"] = preferences.email_notifications
    if preferences.push_notifications is not None:
        update_data["push_notifications"] = preferences.push_notifications
    if preferences.notification_preferences is not None:
        update_data["notification_preferences"] = preferences.notification_preferences
    
    # Add updated timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    # 7. Update the user
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    return MessageResponse(message="Notification preferences updated successfully")
