/**
 * API Client Configuration
 * Base configuration for communicating with the VyOS backend API
 */

// Use /api proxy in browser to avoid CORS, direct URL in server-side
const API_BASE_URL = typeof window !== 'undefined'
  ? '/api'
  : (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000");

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        credentials: "include", // Send cookies (including session token) with every request
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
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
      } catch (parseError) {
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
      if ((error as ApiError).status) {
        throw error;
      }

      throw {
        message: error instanceof Error ? error.message : "Network error occurred",
        details: error,
      } as ApiError;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    let url = endpoint;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url = `${endpoint}?${queryString}`;
    }
    return this.request<T>(url, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const apiClient = new ApiClient();
