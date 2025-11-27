from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import boto3
from botocore.exceptions import ClientError
import uuid
from app.utils.security import decode_access_token
import os

router = APIRouter(prefix="/upload", tags=["Upload"])
security = HTTPBearer()

#S3 Configuration constants
S3_BUCKET = "pact-profile-pictures"
S3_REGION = "us-east-1"

#Initialize S3 client
s3_client = boto3.client('s3', region_name=S3_REGION)


@router.post("/profile-picture")
async def upload_profile_picture(
        file: UploadFile = File(...),
        credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Upload a profile picture to S3 and return the URL
    """
    # Verify JWT token
    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"] # get rid of webp if it causes issues
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )

    # Validate file size (5mb should be fine)
    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="File too large. Max size is 5MB")

    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"users/{user_id}/profile-{uuid.uuid4()}.{file_extension}"

    #Upload to S3
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=unique_filename,
            Body=file_content,
            ContentType=file.content_type
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

    # 6. Return the public URL
    file_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{unique_filename}"

    return {
        "url": file_url,
        "message": "Profile picture uploaded successfully"
    }