import axiosInstance from './axios';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from '../types';

/**
 * Authentication API Service
 */
export const authApi = {
  /**
   * Login user with email and password
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await axiosInstance.post<LoginResponse>(
      '/auth/login',
      data
    );
    return response.data;
  },

  /**
   * Register a new user
   */
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await axiosInstance.post<RegisterResponse>(
      '/auth/register',
      data
    );
    return response.data;
  },

  /**
   * Logout user - clears token from localStorage
   */
  logout: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  },

  /**
   * Verify token is still valid with the backend
   * Throws if token is expired or invalid
   */
  verifyToken: async (): Promise<void> => {
    await axiosInstance.get('/auth/me');
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },

  /**
   * Get current user role
   */
  getRole: (): string | null => {
    return localStorage.getItem('role');
  },

  /**
   * Save auth data to localStorage
   */
  saveAuthData: (token: string, role: string): void => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
  },
};
