#!/usr/bin/env python3
"""Test AWS credentials and S3 bucket access"""
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import os
from pathlib import Path

print("🔍 Checking AWS Credentials...\n")

# Check environment variables
aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")

print("Environment Variables:")
print(f"  AWS_ACCESS_KEY_ID: {'✅ SET' if aws_access_key else '❌ NOT SET'}")
print(f"  AWS_SECRET_ACCESS_KEY: {'✅ SET' if aws_secret_key else '❌ NOT SET'}")

# Check credentials file
creds_file = Path.home() / '.aws' / 'credentials'
print(f"\nCredentials File:")
print(f"  Path: {creds_file}")
print(f"  Exists: {'✅ YES' if creds_file.exists() else '❌ NO'}")

if creds_file.exists():
    with open(creds_file, 'r') as f:
        content = f.read()
        if 'aws_access_key_id' in content:
            # Extract just the first few chars for security
            lines = content.split('\n')
            for line in lines:
                if 'aws_access_key_id' in line:
                    key_id = line.split('=')[1].strip()
                    print(f"  Access Key ID: {key_id[:10]}...")
                    break

# Test S3 access
print("\n🔍 Testing S3 Access...")
try:
    s3_client = boto3.client('s3', region_name='us-east-1')
    print("  ✅ S3 client created successfully")
    
    bucket_name = "pact-profile-pictures"
    print(f"\n  Testing bucket: {bucket_name}")
    
    # Check if bucket exists
    try:
        s3_client.head_bucket(Bucket=bucket_name)
        print(f"  ✅ Bucket '{bucket_name}' exists and is accessible")
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        if error_code == '404':
            print(f"  ❌ Bucket '{bucket_name}' does not exist")
        elif error_code == '403':
            print(f"  ❌ Access Denied to bucket '{bucket_name}'")
            print(f"     Your credentials may not have permission to access this bucket")
        else:
            print(f"  ❌ Error accessing bucket: {error_code}")
    
    # Test PutObject permission
    print(f"\n  Testing PutObject permission...")
    try:
        # Try to list objects (requires ListBucket permission)
        s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=1)
        print(f"  ✅ Can list objects in bucket")
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        if error_code == 'AccessDenied':
            print(f"  ⚠️  Cannot list objects (may need ListBucket permission)")
        else:
            print(f"  ⚠️  List objects error: {error_code}")
    
    # Get caller identity to see which credentials are being used
    try:
        sts_client = boto3.client('sts')
        identity = sts_client.get_caller_identity()
        print(f"\n  ✅ AWS Identity:")
        print(f"     Account: {identity.get('Account', 'Unknown')}")
        print(f"     User/Role: {identity.get('Arn', 'Unknown')}")
    except Exception as e:
        print(f"  ⚠️  Could not get caller identity: {e}")
        
except NoCredentialsError:
    print("  ❌ No AWS credentials found!")
    print("     Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
    print("     or configure ~/.aws/credentials")
except Exception as e:
    print(f"  ❌ Error: {e}")

print("\n" + "="*50)
print("💡 If you see Access Denied errors:")
print("   1. Check that your IAM user/role has s3:PutObject permission")
print("   2. Verify the bucket name is correct: 'pact-profile-pictures'")
print("   3. Ensure the bucket is in region 'us-east-1'")
print("   4. Check bucket policy allows your AWS account/user")

