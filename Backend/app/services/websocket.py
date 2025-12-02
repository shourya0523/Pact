"""
WebSocket Connection Manager

- Manages the real-time WebSocket connections for push notifs
- Handles connection lifecycle and message broadcasting to connected users
"""

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict
from datetime import datetime
from bson import ObjectId

class ConnectionManager:
    """Manages WebSocket connections for real-time notifications"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, user_id: str, websocket: WebSocket):
        """
        Accept and store a new WebSocket connection
        
        takes in:
            user_id: User's ID from auth
            websocket: WebSocket connection obj
        """
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"✅ User {user_id} connected via WebSocket")
    
    async def disconnect(self, user_id: str):
        """
        Remove a WebSocket connection
        
        takes in:
            user_id: User's ID to disconnect
        """
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"❌ User {user_id} disconnected from WebSocket")
    
    async def send_notification(self, user_id: str, message: dict):
        """
        Send a notification to a specific user if connected
        
        takes in:
            user_id: Target user's ID
            message: Notif message dictionary
        """
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
                print(f"📤 Notification sent to user {user_id}: {message.get('type')}")
            except Exception as e:
                print(f"⚠️ Failed to send notification to {user_id}: {e}")
                # Remove stale connection
                await self.disconnect(user_id)
    
    async def broadcast(self, user_ids: list, message: dict):
        """
        Broadcast a notif to multiple users
        
        takes in:
            user_ids: List of user IDs to send notification to
            message: Notification message dictionary
        """
        for user_id in user_ids:
            await self.send_notification(user_id, message)

# Global connection manager instance
manager = ConnectionManager()