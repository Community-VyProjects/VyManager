/**
 * API Client Configuration
 * Base configuration for communicating with the VyOS backend API
 */

// Use /api proxy in browser to avoid CORS, direct URL in server-side
const API_BASE_URL = typeof window !== 'undefined'
  ? '/api'
  : (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000");

import { ApiError } from "../types/api";

/**
 * Get CSRF token from cookies
 * The backend sets a csrf_token cookie that we need to include in headers
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Create an AbortController for request cancellation
   * Returns the signal to pass to fetch and a cancel function
   */
  createAbortController(): { signal: AbortSignal; cancel: () => void } {
    const controller = new AbortController();
    return {
      signal: controller.signal,
      cancel: () => controller.abort(),
    };
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit & { signal?: AbortSignal }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Build headers with CSRF token for state-changing methods
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options?.headers || {}) as Record<string, string>),
    };

    // Add CSRF token for state-changing requests
    const method = options?.method?.toUpperCase() || "GET";
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        credentials: "include", // Send cookies (including session token) with every request
        headers,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorDetails: unknown = undefined;

        // Try to read response body as text first
        const textBody = await response.text();

        try {
          // Try to parse as JSON
          const errorData = JSON.parse(textBody);
          errorDetails = errorData;

          // Extract user-friendly error message from FastAPI response
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Response body is not JSON (could be HTML error page)
          if (textBody.includes("<!DOCTYPE")) {
            errorMessage = `Server returned an error page (${response.status})`;
          } else if (textBody) {
            errorMessage = textBody.substring(0, 200);
          }
        }

        // Special handling for connection failures (503)
        if (response.status === 503 && errorMessage.includes("Failed to connect")) {
          errorMessage = "Failed to connect";
        }

        const error: ApiError = {
          message: errorMessage,
          status: response.status,
          details: errorDetails,
        };

        throw error;
      }

      // Parse JSON response
      const responseText = await response.text();

      try {
        return JSON.parse(responseText);
      } catch {
        // If response is not valid JSON, throw error
        if (responseText.includes("<!DOCTYPE")) {
          throw {
            message: "Server returned an HTML page instead of JSON",
            status: response.status,
          } as ApiError;
        }

        throw {
          message: "Server returned non-JSON response",
          status: response.status,
        } as ApiError;
      }
    } catch (error) {
      // Handle abort errors gracefully
      if (error instanceof Error && error.name === "AbortError") {
        throw {
          message: "Request was cancelled",
          status: 0,
          isAborted: true,
        } as ApiError & { isAborted: boolean };
      }

      if ((error as ApiError).status) {
        throw error;
      }

      throw {
        message: error instanceof Error ? error.message : "Network error occurred",
        details: error,
      } as ApiError;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>, signal?: AbortSignal): Promise<T> {
    let url = endpoint;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url = `${endpoint}?${queryString}`;
    }
    return this.request<T>(url, { method: "GET", signal });
  }

  async post<T>(endpoint: string, data?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      signal,
    });
  }

  async put<T>(endpoint: string, data?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      signal,
    });
  }

  async delete<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", signal });
  }

  async patch<T>(endpoint: string, data?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
      signal,
    });
  }
}

export const apiClient = new ApiClient();
