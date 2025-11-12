from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from bson import ObjectId


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    display_name: str = Field(default="")  
    profile_photo_url: str = Field(default="")  
    profile_completed: bool = Field(default=False)  
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    notification_preferences: dict = Field(default_factory=dict)
    is_active: bool = True

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    display_name: str
    profile_photo_url: str
    profile_completed: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileSetupRequest(BaseModel):
    """Request model for initial profile setup"""
    display_name: str = Field(..., min_length=1, max_length=50, description="User's display name")
    profile_photo_url: str = Field(..., min_length=1, description="URL to user's profile photo")

    @field_validator('profile_photo_url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate that profile_photo_url is a valid URL"""
        if not v.startswith(('http://', 'https://')):
            raise ValueError('profile_photo_url must be a valid HTTP/HTTPS URL')
        return v