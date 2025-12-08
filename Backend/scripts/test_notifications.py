#!/usr/bin/env python3
"""
Test script to verify push notifications are working.

This script tests:
1. Partner request notifications
2. Checkin reminder notifications
3. WebSocket connectivity

Usage:
    python scripts/test_notifications.py
"""

import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv is optional

from config.database import get_database, connect_to_mongo, close_mongo_connection
from app.services.notification_service import notification_service
from bson import ObjectId


async def test_partner_request_notification():
    """Test partner request notification"""
    print("\n" + "="*60)
    print("TEST 1: Partner Request Notification")
    print("="*60)
    
    db = get_database()
    
    # Get two test users
    users = await db.users.find().limit(2).to_list(2)
    
    if len(users) < 2:
        print("❌ Need at least 2 users in database for testing")
        return False
    
    sender = users[0]
    receiver = users[1]
    
    sender_id = str(sender["_id"])
    receiver_id = str(receiver["_id"])
    sender_username = sender.get("username", "TestUser")
    
    print(f"   Sender: {sender_username} ({sender_id})")
    print(f"   Receiver: {receiver.get('username', 'TestUser')} ({receiver_id})")
    
    # Create a test request ID
    test_request_id = str(ObjectId())
    
    try:
        await notification_service.send_partner_request_notification(
            receiver_id=receiver_id,
            sender_id=sender_id,
            sender_username=sender_username,
            request_id=test_request_id,
            message="🧪 Test partner request notification"
        )
        print("✅ Partner request notification sent successfully!")
        
        # Verify it was saved to database
        notification = await db.notifications.find_one({
            "user_id": ObjectId(receiver_id),
            "type": "partnership_request",
            "related_id": test_request_id
        })
        
        if notification:
            print(f"✅ Notification saved to database: {notification.get('title')}")
            return True
        else:
            print("⚠️  Notification sent but not found in database")
            return False
            
    except Exception as e:
        print(f"❌ Failed to send partner request notification: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_checkin_reminder_notification():
    """Test checkin reminder notification"""
    print("\n" + "="*60)
    print("TEST 2: Checkin Reminder Notification")
    print("="*60)
    
    db = get_database()
    
    # Get a user with an active habit
    habit = await db.habits.find_one({"status": "active"})
    
    if not habit:
        print("❌ No active habits found for testing")
        return False
    
    habit_id = str(habit["_id"])
    habit_name = habit.get("habit_name", "Test Habit")
    
    # Get partnership and users
    partnership_id = habit.get("partnership_id")
    if isinstance(partnership_id, str):
        partnership_id = ObjectId(partnership_id)
    
    partnership = await db.partnerships.find_one({"_id": partnership_id})
    if not partnership:
        print("❌ Habit has no partnership")
        return False
    
    user_id = str(partnership["user_id_1"])
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    username = user.get("username", "TestUser") if user else "TestUser"
    
    print(f"   User: {username} ({user_id})")
    print(f"   Habit: {habit_name} ({habit_id})")
    
    try:
        await notification_service.send_habit_reminder_notification(
            user_id=user_id,
            habit_id=habit_id,
            habit_name=habit_name
        )
        print("✅ Checkin reminder notification sent successfully!")
        
        # Verify it was saved to database
        notification = await db.notifications.find_one({
            "user_id": ObjectId(user_id),
            "type": "habit_reminder",
            "related_id": habit_id
        }, sort=[("created_at", -1)])
        
        if notification:
            print(f"✅ Notification saved to database: {notification.get('title')}")
            print(f"   Message: {notification.get('message', '')[:50]}...")
            return True
        else:
            print("⚠️  Notification sent but not found in database")
            return False
            
    except Exception as e:
        print(f"❌ Failed to send checkin reminder notification: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_notification_preferences():
    """Test notification preference checking"""
    print("\n" + "="*60)
    print("TEST 3: Notification Preferences")
    print("="*60)
    
    db = get_database()
    
    # Get a test user
    user = await db.users.find_one()
    if not user:
        print("❌ No users found for testing")
        return False
    
    user_id = str(user["_id"])
    username = user.get("username", "TestUser")
    
    print(f"   User: {username} ({user_id})")
    
    # Check preferences for different notification types
    test_types = [
        ("partnership_request", "partner_requests"),
        ("habit_reminder", "habit_reminders"),
    ]
    
    all_passed = True
    for notif_type, pref_key in test_types:
        try:
            is_enabled = await notification_service.check_user_preferences(
                user_id=user_id,
                notification_type=notif_type
            )
            prefs = user.get("notification_preferences", {})
            pref_value = prefs.get(pref_key, True)  # Default to True
            
            status = "✅" if is_enabled == pref_value else "⚠️"
            print(f"   {status} {notif_type} -> {pref_key}: {is_enabled} (expected: {pref_value})")
            
            if is_enabled != pref_value:
                all_passed = False
        except Exception as e:
            print(f"   ❌ Error checking {notif_type}: {e}")
            all_passed = False
    
    return all_passed


async def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("🧪 NOTIFICATION SYSTEM TEST SUITE")
    print("="*60)
    
    await connect_to_mongo()
    
    try:
        results = []
        
        # Test 1: Partner request notification
        results.append(await test_partner_request_notification())
        
        # Test 2: Checkin reminder notification
        results.append(await test_checkin_reminder_notification())
        
        # Test 3: Notification preferences
        results.append(await test_notification_preferences())
        
        # Summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        passed = sum(results)
        total = len(results)
        print(f"   Tests passed: {passed}/{total}")
        
        if passed == total:
            print("   ✅ All tests passed!")
        else:
            print("   ⚠️  Some tests failed")
        
        return passed == total
        
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)

