/**
 * Authentication API Service
 * Handles all authentication related API operations
 */

import { apiClient } from "./client";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    username: string;
    email?: string;
  };
}

export class AuthService {
  /**
   * Login with username and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>("/auth/login", credentials);
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    return apiClient.post<void>("/auth/logout", {});
  }

  /**
   * Verify current session
   */
  async verifySession(): Promise<{ valid: boolean }> {
    return apiClient.get<{ valid: boolean }>("/auth/verify");
  }
}

export const authService = new AuthService();
