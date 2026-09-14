/**
 * API Client Configuration
 * Base configuration for communicating with the VyOS backend API
 */

// Use /api proxy in browser to avoid CORS, direct URL in server-side.
// BACKEND_URL is a plain (non-NEXT_PUBLIC_) env var so it is read at runtime,
// not baked in at build time. Set it in .env.
function resolveBackendUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  const url = process.env.BACKEND_URL;
  if (!url) {
    throw new Error('BACKEND_URL environment variable is not set');
  }
  return url;
}

import { ApiError } from "../types/api";
import { recordApiError } from "../error-capture";
import { websocketBaseUrl } from "../ws-base";

export class ApiClient {
  private readonly _baseUrl?: string;

  constructor(baseUrl?: string) {
    this._baseUrl = baseUrl;
  }

  private get baseUrl(): string {
    return this._baseUrl ?? resolveBackendUrl();
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

        // Capture for the bug reporter: unexpected server errors (5xx) and any
        // failure on a config mutation (/batch), where a 400 usually signals a
        // batching bug. Skip routine 4xx on read endpoints (auth/not-found).
        const isBatch = endpoint.includes("/batch");
        if (response.status >= 500 || (isBatch && response.status >= 400)) {
          const payload = typeof options?.body === "string" ? options.body : undefined;
          recordApiError(endpoint, response.status, errorMessage, payload);
        }

        throw error;
      }

      // Parse JSON response
      const responseText = await response.text();

      try {
        const parsed = JSON.parse(responseText);
        // VyOS commit failures come back as HTTP 200 with { success: false }, so
        // capture those here (with the payload) — they never hit the !ok branch.
        if (
          parsed &&
          typeof parsed === "object" &&
          (parsed as { success?: unknown }).success === false
        ) {
          const payload = typeof options?.body === "string" ? options.body : undefined;
          recordApiError(
            endpoint,
            response.status,
            (parsed as { error?: string }).error || "Operation failed",
            payload,
          );
        }
        return parsed;
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
      if ((error as ApiError).status) {
        throw error;
      }

      const message = error instanceof Error ? error.message : "Network error occurred";
      recordApiError(endpoint, 0, message);
      throw {
        message,
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

/**
 * Resolve the WebSocket base URL.
 *
 * Priority:
 *  1. NEXT_PUBLIC_WS_URL env var
 *  2. UI on a non-80/443 port (compose :3000, on-box :3010): backend :8000
 *  3. Production reverse proxy on 80/443: same origin
 */
export function resolveWsBase(): string {
  return websocketBaseUrl({
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    port: window.location.port,
    explicit: process.env.NEXT_PUBLIC_WS_URL,
  });
}
