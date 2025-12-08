import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../config';
import { notificationAPI, NotificationData } from './notificationAPI';
import * as Notifications from 'expo-notifications';

const WS_URL = BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');

export interface WebSocketNotification {
    id: string;
    type: string;
    title: string;
    message?: string;
    data?: any;
    created_at: string;
    is_read: boolean;
    related_id?: string;
    related_user_id?: string;
}

class WebSocketService {
    private ws: WebSocket | null = null;
    private userId: string | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 3000; // 3 seconds
    private reconnectTimer: NodeJS.Timeout | null = null;
    private isConnecting = false;
    private onNotificationCallback: ((notification: NotificationData) => void) | null = null;
    private pingInterval: NodeJS.Timeout | null = null;

    /**
     * Connect to WebSocket server
     */
    async connect(userId: string): Promise<void> {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            console.log('🔌 WebSocket already connected or connecting');
            return;
        }

        this.userId = userId;
        this.isConnecting = true;

        try {
            const wsUrl = `${WS_URL}/ws/${userId}`;
            console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.startPingInterval();
            };

            this.ws.onmessage = async (event) => {
                try {
                    // Handle pong response (plain text, not JSON)
                    if (event.data === 'pong') {
                        return;
                    }

                    // Try to parse as JSON for notifications
                    const data = JSON.parse(event.data);

                    // Handle notification
                    if (data.type && data.title) {
                        await this.handleNotification(data);
                    }
                } catch (error) {
                    console.error('❌ Error parsing WebSocket message:', error);
                }
            };

            this.ws.onerror = (error) => {
                // Only log errors if we're not already reconnecting
                if (this.reconnectAttempts === 0) {
                    console.warn('⚠️ WebSocket connection error (will attempt to reconnect)');
                }
                this.isConnecting = false;
            };

            this.ws.onclose = (event) => {
                // Only log if it wasn't a normal closure
                if (event.code !== 1000) {
                    console.log(`🔌 WebSocket disconnected (code: ${event.code})`);
                }
                this.isConnecting = false;
                this.stopPingInterval();
                
                // Only attempt reconnect if it wasn't a manual disconnect
                if (this.userId && event.code !== 1000) {
                    this.attemptReconnect();
                }
            };

        } catch (error) {
            console.error('❌ Error creating WebSocket connection:', error);
            this.isConnecting = false;
            this.attemptReconnect();
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        console.log('🔌 Disconnecting WebSocket');
        this.stopPingInterval();
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Clear userId first to prevent reconnection attempts
        const wasConnected = this.userId !== null;
        this.userId = null;
        this.reconnectAttempts = 0;

        if (this.ws) {
            // Close with normal closure code to prevent reconnect
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.close(1000, 'Normal closure');
            }
            this.ws = null;
        }
    }

    /**
     * Attempt to reconnect to WebSocket
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('❌ Max reconnection attempts reached');
            return;
        }

        if (!this.userId) {
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;

        console.log(`🔄 Attempting to reconnect in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            if (this.userId) {
                this.connect(this.userId);
            }
        }, delay);
    }

    /**
     * Start ping interval to keep connection alive
     */
    private startPingInterval(): void {
        this.stopPingInterval();
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send('ping');
            }
        }, 30000); // Ping every 30 seconds
    }

    /**
     * Stop ping interval
     */
    private stopPingInterval(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * Handle incoming notification
     */
    private async handleNotification(data: WebSocketNotification): Promise<void> {
        console.log('📬 Received notification via WebSocket:', data.title);

        // Convert to NotificationData format
        const notification: NotificationData = {
            id: data.id,
            type: data.type as any,
            title: data.title,
            message: data.message,
            time_ago: 'Just now',
            is_read: data.is_read,
            action_taken: false,
            related_id: data.related_id,
            related_user_id: data.related_user_id,
            created_at: data.created_at
        };

        // Show push notification
        await this.showPushNotification(notification);

        // Call callback if registered
        if (this.onNotificationCallback) {
            this.onNotificationCallback(notification);
        }
    }

    /**
     * Show push notification using Expo Notifications
     */
    private async showPushNotification(notification: NotificationData): Promise<void> {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: notification.title,
                    body: notification.message || '',
                    data: notification,
                    sound: true,
                },
                trigger: null, // Show immediately
            });
        } catch (error) {
            console.error('❌ Error showing push notification:', error);
        }
    }

    /**
     * Register callback for new notifications
     */
    onNotification(callback: (notification: NotificationData) => void): void {
        this.onNotificationCallback = callback;
    }

    /**
     * Check if WebSocket is connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

export const websocketService = new WebSocketService();

