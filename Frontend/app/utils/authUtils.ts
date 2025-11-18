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
 * Automatically handles token expiration (401 errors)
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

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    // Handle token expiration (401) automatically
    if (response.status === 401) {
        console.log('🔒 Token expired during API call - clearing auth data');
        await handleTokenExpiration();
    }

    return response;
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
 * Signup new user and automatically log them in
 * Returns the same data as login (token + user)
 */
export const signup = async (
    username: string,
    email: string,
    password: string
): Promise<any> => {
    const BASE_URL = await getBaseUrl();
    
    // Step 1: Create account
    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
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

    const signupData = await signupResponse.json();

    if (!signupResponse.ok) {
        throw new Error(signupData.detail || 'Signup failed');
    }

    // Step 2: Automatically log in the newly created user
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
        }),
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
        throw new Error(loginData.detail || 'Auto-login after signup failed');
    }

    // Step 3: Store token and user data
    await storeToken(loginData.access_token);
    await storeUserData(loginData.user);

    return loginData;
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

/**
 * Check if token might be expired (client-side check)
 * Note: This is a best-effort check. Server validation is authoritative.
 * JWT tokens contain expiration time, but we'd need to decode them to check.
 * For now, we rely on server validation.
 */
export const isTokenLikelyExpired = async (): Promise<boolean> => {
    // For now, we don't decode JWT on client side
    // We rely on server validation via validateToken()
    // This function is a placeholder for future enhancement
    return false;
};

/**
 * Validate token by checking with backend
 * Returns true if token is valid, false otherwise
 * Clears auth data if token is invalid/expired (401)
 * 
 * Token expiration handling:
 * - Backend returns 401 when token is expired/invalid
 * - We detect 401 and automatically clear auth data
 * - User is redirected to login screen
 */
export const validateToken = async (): Promise<boolean> => {
    try {
        const token = await getToken();
        
        // No token means not authenticated
        if (!token) {
            return false;
        }

        // Try to get current user - this validates the token
        const response = await authenticatedFetch('/api/auth/me');
        
        if (response.ok) {
            // Token is valid, update user data
            const userData = await response.json();
            await storeUserData(userData);
            return true;
        } else if (response.status === 401) {
            // Token is invalid or expired - clear auth data
            console.log('🔒 Token expired or invalid (401) - clearing auth data');
            console.log('💡 User will be redirected to login screen');
            await clearAuthData();
            return false;
        } else {
            // Other error (network, server error, etc.)
            console.error('⚠️ Token validation failed with status:', response.status);
            // Don't clear auth on network errors - might be temporary
            return false;
        }
    } catch (error: any) {
        // Network error or other exception
        console.error('⚠️ Token validation error:', error.message);
        // On network errors, assume token might still be valid
        // User will be redirected to login if token is actually invalid
        return false;
    }
};

/**
 * Handle token expiration gracefully
 * Called when a 401 error is detected during API calls
 * Clears auth data and optionally shows a message to user
 */
export const handleTokenExpiration = async (): Promise<void> => {
    console.log('🔒 Handling token expiration...');
    await clearAuthData();
    console.log('✅ Auth data cleared. User should be redirected to login.');
};