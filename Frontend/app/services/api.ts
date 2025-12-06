import { BASE_URL } from '../../config';
import { logger } from '../utils/logger';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SignupData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    email: string;
    display_name: string;
    profile_photo_url: string;
    profile_completed: boolean;
    created_at: string;
  };
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  display_name: string;
  profile_photo_url: string;
  profile_completed: boolean;
  created_at: string;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = BASE_URL;
    logger.log('ApiService initialized with URL:', this.baseURL);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      logger.log(`Making request to: ${url}`);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      logger.log('Response status:', response.status);

      // Get response text first
      const text = await response.text();

      // Check if it's actually JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        logger.error('Failed to parse JSON. Response was:', text);
        return {
          success: false,
          error: `Server returned invalid JSON. Status: ${response.status}. Make sure backend is running.`,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || `Request failed with status ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      logger.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error - make sure backend is running',
      };
    }
  }

  // Auth endpoints
  async signup(userData: SignupData): Promise<ApiResponse<UserResponse>> {
    return this.request<UserResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: LoginData): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getCurrentUser(token: string): Promise<ApiResponse<UserResponse>> {
    return this.request<UserResponse>('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async uploadProfilePicture(imageUri: string, token: string): Promise<ApiResponse<{ url: string; message: string }>> {
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      // @ts-ignore - React Native FormData expects an object with uri, name, type
      formData.append('file', {
        uri: imageUri,
        name: filename,
        type,
      });

      logger.log('Uploading image...', { uri: imageUri, type, name: filename });

      const response = await fetch(`${this.baseURL}/upload/profile-picture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept': 'application/json',
          // Do NOT set Content-Type here, let fetch set it for multipart/form-data
        },
        body: formData,
      });

      logger.log('Upload response status:', response.status);
      
      const text = await response.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return {
          success: false,
          error: `Server returned invalid JSON. Status: ${response.status}`,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || `Upload failed with status ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      logger.error('Image upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error during upload',
      };
    }
  }
}

export const api = new ApiService();