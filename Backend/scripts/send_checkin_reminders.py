#!/usr/bin/env python3
"""
Script to send checkin reminder notifications.

This script can be run manually or scheduled via cron to send daily
checkin reminders to users who haven't checked in yet today.

Usage:
    python scripts/send_checkin_reminders.py
    
Or schedule via crontab:
    0 9 * * * cd /path/to/Backend && python scripts/send_checkin_reminders.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv is optional

import httpx


async def send_checkin_reminders():
    """Call the checkin reminders endpoint"""
    base_url = os.getenv("BASE_URL", "http://localhost:8000")
    secret_key = os.getenv("REMINDER_CRON_SECRET", "change-me-in-production")
    
    endpoint = f"{base_url}/api/notifications/send-checkin-reminders"
    
    print(f"📬 Sending checkin reminders...")
    print(f"   Endpoint: {endpoint}")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                endpoint,
                params={"secret_key": secret_key}
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Success!")
                print(f"   {result.get('message', 'Reminders sent')}")
                print(f"   Reminders sent: {result.get('reminders_sent', 0)}")
                return True
            else:
                print(f"❌ Error: {response.status_code}")
                print(f"   {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ Failed to send checkin reminders: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(send_checkin_reminders())
    sys.exit(0 if success else 1)

