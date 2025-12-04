import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface NotificationData {
    id: string;
    type: 'partner_nudge' | 'partnership_request' | 'partner_checkin' | 'habit_reminder' | 'progress_milestone' | 'missed_habit';
    title: string;
    message?: string;
    time_ago: string;
    is_read: boolean;
    action_taken: boolean;
    related_id?: string;
    related_user_id?: string;
    partner_username?: string;
    partner_avatar?: string;
    habit_name?: string;
    created_at: string;
}

class NotificationAPIService {
    private async getAuthToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem('access_token');
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    }

    // Retrieving the notif type
    private async getHeaders() {
        const token = await this.getAuthToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        };
    }

    // Retrieving actual existing notifs
    async getNotifications(): Promise<NotificationData[]> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/notifications/`, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }

    // marking notifs as seen
        // idk if necessary but it's here if we wanna do something more with it UI wise
            // - audrey
    async markAsRead(notificationId: string): Promise<void> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    // Marking the notifs for whether or not the user has pressed one of the button prompts
    async markActionTaken(notificationId: string): Promise<void> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/notifications/${notificationId}/action`, {
                method: 'PUT',
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error marking notification action:', error);
            throw error;
        }
    }

    // Deletes notif after the user pressed a button
    async deleteNotification(notificationId: string): Promise<void> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/notifications/${notificationId}`, {
                method: 'DELETE',
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }

    // sending nudge to partners/friends
    async sendNudge(partnerId: string, habitId: string): Promise<void> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/notifications/nudge/${partnerId}?habit_id=${habitId}`, {
                method: 'POST',
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error sending nudge:', error);
            throw error;
        }
    }

    // Counter for how many unread notifs a given user has
    async getUnreadCount(): Promise<number> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/notifications/unread/count`, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.unread_count;
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    }
}

export const notificationAPI = new NotificationAPIService();
