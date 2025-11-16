import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@pact_auth_token';
const USER_KEY = '@pact_user_data';

export interface StoredUser {
  id: string;
  username: string;
  email: string;
  display_name: string;
  profile_photo_url: string;
  profile_completed: boolean;
}

class StorageService {
  // Token management
  async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      console.log('Token saved successfully');
    } catch (error) {
      console.error('Failed to save token:', error);
      throw error;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      return token;
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      console.log('Token removed successfully');
    } catch (error) {
      console.error('Failed to remove token:', error);
      throw error;
    }
  }

  // User data management
  async saveUser(user: StoredUser): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      console.log('User data saved successfully');
    } catch (error) {
      console.error('Failed to save user data:', error);
      throw error;
    }
  }

  async getUser(): Promise<StoredUser | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  }

  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_KEY);
      console.log('User data removed successfully');
    } catch (error) {
      console.error('Failed to remove user data:', error);
      throw error;
    }
  }

  // Clear all auth data
  async clearAuth(): Promise<void> {
    try {
      await Promise.all([this.removeToken(), this.removeUser()]);
      console.log('All auth data cleared');
    } catch (error) {
      console.error('Failed to clear auth data:', error);
      throw error;
    }
  }
}

export const storage = new StorageService();