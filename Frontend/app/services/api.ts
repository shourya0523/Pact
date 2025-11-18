import { BASE_URL } from '../../config';

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
    console.log('ApiService initialized with URL:', this.baseURL);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`Making request to: ${url}`);
      console.log('Request options:', options);

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Get response text first
      const text = await response.text();
      console.log('Response text:', text);

      // Check if it's actually JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse JSON. Response was:', text);
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
      console.error('API request failed:', error);
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
}

export const api = new ApiService();