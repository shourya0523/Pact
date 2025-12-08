import pytest
from unittest.mock import patch, MagicMock, ANY
from jose import jwt
from datetime import datetime, timedelta
import os

# Get JWT config from environment variables
JWT_SECRET = os.getenv("JWT_SECRET", "test_secret_key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")


# Helper to generate test JWT token
def create_test_token(user_id: str = "507f1f77bcf86cd799439011"):
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@pytest.fixture
def mock_s3_client():
    """Mock boto3 S3 client"""
    with patch('app.routes.upload.s3_client') as mock:
        mock.put_object.return_value = {}
        yield mock


@pytest.fixture
def mock_decode_token():
    """Mock JWT decode"""
    with patch('app.routes.upload.decode_access_token') as mock:
        mock.return_value = {"sub": "507f1f77bcf86cd799439011"}
        yield mock


def test_s3_client_mock(mock_s3_client):
    """Test that S3 client is properly mocked"""
    assert mock_s3_client is not None
    mock_s3_client.put_object(Bucket="test", Key="test", Body=b"test")
    mock_s3_client.put_object.assert_called_once()


def test_token_generation():
    """Test JWT token generation"""
    token = create_test_token()
    assert token is not None
    assert isinstance(token, str)

    # Decode and verify
    decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    assert decoded["sub"] == "507f1f77bcf86cd799439011"