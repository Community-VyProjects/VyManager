/**
 * API utilities for making requests to the backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Fetch configuration from the API with proper error handling
 */
export async function fetchConfig() {
  try {
    const response = await fetch(`${API_URL}/api/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add custom headers if needed for reverse proxy
        'X-Requested-With': 'XMLHttpRequest',
      },
      // Include credentials if your API requires authentication
      credentials: 'include',
    });
    
    if (!response.ok) {
      // Try to get error details if available
      const errorData = await response.json().catch(() => ({
        error: `Server error: ${response.status} ${response.statusText}`
      }));
      
      // Throw a detailed error object
      throw {
        status: response.status,
        statusText: response.statusText,
        message: errorData.error || `Server returned ${response.status} ${response.statusText}`,
        data: errorData
      };
    }
    
    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    // Re-throw for component handling
    throw error;
  }
}

/**
 * Generic API fetcher that can be used for any endpoint
 */
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'include',
  };
  
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(url, mergedOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Server error: ${response.status} ${response.statusText}`
      }));
      
      throw {
        status: response.status,
        statusText: response.statusText,
        message: errorData.error || `Server returned ${response.status} ${response.statusText}`,
        data: errorData
      };
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error (${url}):`, error);
    throw error;
  }
} 