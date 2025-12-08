from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Request
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

# Initialize S3 client with credentials from environment variables
# AWS credentials should be set via:
# - Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
# - AWS credentials file: ~/.aws/credentials
# - IAM role (if running on EC2/Lambda)
def get_s3_client():
    """Get S3 client with proper error handling"""
    try:
        # Check if credentials are available
        aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        
        if aws_access_key and aws_secret_key:
            return boto3.client(
                's3',
                region_name=S3_REGION,
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key
            )
        else:
            # Try using default credential chain (credentials file, IAM role, etc.)
            return boto3.client('s3', region_name=S3_REGION)
    except Exception as e:
        raise Exception(f"Failed to initialize S3 client: {str(e)}")

s3_client = get_s3_client()


@router.post("/profile-picture")
async def upload_profile_picture(
        request: Request,
        credentials: HTTPAuthorizationCredentials = Depends(security),
        file: UploadFile = File(None)  # Make optional to handle manual parsing
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

    # Parse form data manually to handle React Native FormData format
    # FastAPI might not parse it correctly, so we handle it manually
    if not file or not file.filename:
        try:
            form = await request.form()
            file = form.get("file")
            
            if not file:
                raise HTTPException(
                    status_code=422,
                    detail="No file provided. Please ensure the file is sent with the 'file' field name in multipart/form-data format."
                )
            
            # Ensure it's an UploadFile
            if not isinstance(file, UploadFile):
                raise HTTPException(
                    status_code=422,
                    detail="Invalid file format. Expected file upload in 'file' field."
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Failed to parse file upload. Ensure Content-Type is 'multipart/form-data' and file field is named 'file'. Error: {str(e)}"
            )

    # Validate file type - handle None content_type and mobile formats
    allowed_types = [
        "image/jpeg", 
        "image/jpg", 
        "image/png", 
        "image/webp",
        "image/heic",
        "image/heif",
        "application/octet-stream"  # Allow unknown types, validate by extension
    ]
    
    # Mobile-specific content types
    mobile_types = [
        "image/heic",
        "image/heif",
        "public.heic",
        "public.heif"
    ]
    
    content_type = file.content_type or "application/octet-stream"
    
    # Try to infer content type from filename if not provided or if it's a generic type
    if (content_type == "application/octet-stream" or content_type in mobile_types) and file.filename:
        ext = file.filename.split(".")[-1].lower()
        type_map = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
            "heic": "image/heic",
            "heif": "image/heif"
        }
        inferred_type = type_map.get(ext, content_type)
        if inferred_type != "application/octet-stream":
            content_type = inferred_type
    
    # Validate - allow if it's an image type or if we can infer it's an image from extension
    is_valid_image = (
        content_type.startswith("image/") or 
        content_type in allowed_types or
        (file.filename and file.filename.split(".")[-1].lower() in ["jpg", "jpeg", "png", "webp", "heic", "heif"])
    )
    
    if not is_valid_image:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {content_type}. Please upload an image file (JPEG, PNG, WebP, HEIC, or HEIF)."
        )
    
    # Normalize content type for S3 storage
    if content_type in ["image/heic", "image/heif", "public.heic", "public.heif"]:
        # Store HEIC/HEIF as-is, or convert to JPEG if needed
        # For now, we'll store as HEIC but browsers may not display it
        # Consider converting to JPEG in the future
        content_type = "image/heic"

    # Validate file size (5mb should be fine)
    file_content = await file.read()
    if len(file_content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="File too large. Max size is 5MB")

    # Generate unique filename - preserve original extension or default to jpg
    if file.filename:
        file_extension = file.filename.split(".")[-1].lower()
        # Normalize HEIC/HEIF extensions
        if file_extension in ["heic", "heif"]:
            file_extension = "heic"  # Standardize to heic
    else:
        # Infer from content type if filename is missing
        if "heic" in content_type.lower() or "heif" in content_type.lower():
            file_extension = "heic"
        elif "jpeg" in content_type.lower() or "jpg" in content_type.lower():
            file_extension = "jpg"
        elif "png" in content_type.lower():
            file_extension = "png"
        else:
            file_extension = "jpg"  # Default fallback
    
    unique_filename = f"users/{user_id}/profile-{uuid.uuid4()}.{file_extension}"

    #Upload to S3
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=unique_filename,
            Body=file_content,
            ContentType=content_type
        )
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_message = e.response.get('Error', {}).get('Message', str(e))
        
        if error_code == 'AccessDenied':
            raise HTTPException(
                status_code=403,
                detail=f"S3 Access Denied. Please check AWS credentials and bucket permissions. "
                       f"Ensure the AWS credentials have 's3:PutObject' permission for bucket '{S3_BUCKET}'. "
                       f"Error: {error_message}"
            )
        elif error_code == 'NoSuchBucket':
            raise HTTPException(
                status_code=404,
                detail=f"S3 bucket '{S3_BUCKET}' not found. Please verify the bucket name and region."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload file to S3. Error ({error_code}): {error_message}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during file upload: {str(e)}"
        )

    # 6. Return the public URL
    file_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{unique_filename}"

    return {
        "url": file_url,
        "message": "Profile picture uploaded successfully"
    }