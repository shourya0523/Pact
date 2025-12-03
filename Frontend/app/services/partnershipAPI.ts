import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

class PartnershipAPIService {
    private async getAuthToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem('access_token');
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    }

    private async getHeaders() {
        const token = await this.getAuthToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        };
    }

    // Accepting partner req
    async acceptPartnershipRequest(requestId: string): Promise<void> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/partnerships/invites/${requestId}/accept`, {
                method: 'POST',
                headers,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error accepting partnership request:', error);
            throw error;
        }
    }

    // Denying partner req
    async declinePartnershipRequest(requestId: string): Promise<void> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/partnerships/invites/${requestId}/reject`, {
                method: 'POST',
                headers,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error declining partnership request:', error);
            throw error;
        }
    }

    // pending outgoing friend req
    async getPendingRequests(): Promise<any[]> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/partnerships/invites`, {
                method: 'GET',
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching pending requests:', error);
            throw error;
        }
    }
}

export const partnershipAPI = new PartnershipAPIService();
