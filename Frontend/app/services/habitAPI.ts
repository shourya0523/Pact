import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

class HabitAPIService {
    private async getAuthToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem('access_token');
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    }

    // Retrieving habit type
    private async getHeaders() {
        const token = await this.getAuthToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        };
    }

    // whether a habit has been checked in for or not
    async checkInHabit(habitId: string): Promise<void> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/habits/${habitId}/log`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ completed: true }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error checking in habit:', error);
            throw error;
        }
    }

    // Information on a given habits
    async getHabitDetails(habitId: string): Promise<any> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/habits/${habitId}`, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting habit details:', error);
            throw error;
        }
    }
}

export const habitAPI = new HabitAPIService();
