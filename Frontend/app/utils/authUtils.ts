import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from 'config';

/**
 * Authentication utility functions for managing tokens and API calls
 */

// Storage keys
const TOKEN_KEY = 'access_token';
const USER_DATA_KEY = 'user_data';

/**
 * Store authentication token
 */
export const storeToken = async (token: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
        console.error('Error storing token:', error);
        throw error;
    }
};

/**
 * Get stored authentication token
 */
export const getToken = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
};

/**
 * Remove authentication token
 */
export const removeToken = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
        console.error('Error removing token:', error);
        throw error;
    }
};

/**
 * Store user data
 */
export const storeUserData = async (userData: any): Promise<void> => {
    try {
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    } catch (error) {
        console.error('Error storing user data:', error);
        throw error;
    }
};

/**
 * Get stored user data
 */
export const getUserData = async (): Promise<any | null> => {
    try {
        const data = await AsyncStorage.getItem(USER_DATA_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
};

/**
 * Remove user data
 */
export const removeUserData = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(USER_DATA_KEY);
    } catch (error) {
        console.error('Error removing user data:', error);
        throw error;
    }
};

/**
 * Clear all authentication data
 */
export const clearAuthData = async (): Promise<void> => {
    try {
        await removeToken();
        await removeUserData();
    } catch (error) {
        console.error('Error clearing auth data:', error);
        throw error;
    }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
    const token = await getToken();
    return token !== null;
};

/**
 * Make an authenticated API call
 */
export const authenticatedFetch = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> => {
    const token = await getToken();
    const BASE_URL = await getBaseUrl();

    if (!token) {
        throw new Error('No authentication token found');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };

    return fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });
};

/**
 * Login user and store credentials
 */
export const login = async (email: string, password: string): Promise<any> => {
    const BASE_URL = await getBaseUrl();
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
    }

    // Store token and user data
    await storeToken(data.access_token);
    await storeUserData(data.user);

    return data;
};

/**
 * Signup new user
 */
export const signup = async (
    username: string,
    email: string,
    password: string
): Promise<any> => {
    const BASE_URL = await getBaseUrl();
    
    const response = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || 'Signup failed');
    }

    return data;
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
    await clearAuthData();
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (): Promise<any> => {
    const response = await authenticatedFetch('/api/auth/me');
    
    if (!response.ok) {
        throw new Error('Failed to get user profile');
    }

    const userData = await response.json();
    await storeUserData(userData);
    
    return userData;
};