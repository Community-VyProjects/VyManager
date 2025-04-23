/**
 * API utilities for making requests to the backend
 */

import { frontendCache } from './cache';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface DHCPLease {
  ip_address: string;
  mac_address: string;
  state: string;
  lease_start: string;
  lease_end: string;
  remaining: string;
  pool: string;
  hostname: string;
  origin: string;
}

interface DHCPLeasesByPool {
  [pool: string]: DHCPLease[];
}

interface DHCPLeasesResponse {
  success: boolean;
  leases: DHCPLeasesByPool;
  error: string | null;
}

interface RouteNexthop {
  ip: string;
  interface: string;
  active: boolean;
  directly_connected: boolean;
}

interface Route {
  destination: string;
  prefix_length?: string;
  protocol: string;
  vrf: string;
  selected: boolean;
  installed: boolean;
  distance?: number;
  metric?: number;
  uptime: string;
  nexthops: RouteNexthop[];
}

interface RoutingTableByVrf {
  [vrf: string]: Route[];
}

interface RoutingTableResponse {
  success: boolean;
  routes_by_vrf: RoutingTableByVrf;
  error: string | null;
  count: number;
  timestamp: string;
}

interface CacheStats {
  items: number;
  hits: number;
  misses: number;
  hit_rate: number;
  uptime: number;
}

interface CacheStatsResponse {
  success: boolean;
  stats: CacheStats;
  error: string | null;
}

interface ClearCacheResponse {
  success: boolean;
  message: string;
  error: string | null;
}

/**
 * Fetch configuration from the API with proper error handling
 */
export async function fetchConfig() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/config`, {
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
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
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

// Generic API client function with typing
async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    
    let errorText = '';
    try {
      // Try to parse error as JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } else {
        errorText = await response.text();
      }
    } catch (textError) {
      errorText = `Failed to read error response: ${textError}`;
    }
    
    if (!response.ok) {
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    if (!data.success && data.error) {
      throw new Error(`API error: ${data.error}`);
    }
    
    return data as T;
  } catch (error) {
    // Enhance fetch errors with more details
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(`Network error: Could not connect to API at ${url}. Make sure the backend server is running on port 8000.`);
    }
    
    // Re-throw all other errors
    throw error;
  }
}

// API functions that use our cache
export const api = {
  // Configuration
  async getConfig(path: string = ''): Promise<any> {
    return apiClient(`/config/${path}`);
  },
  
  async setConfig(path: string, value?: string): Promise<ApiResponse<any>> {
    const result = await apiClient<ApiResponse<any>>(
      `/configure/set/${path}${value ? `?value=${encodeURIComponent(value)}` : ''}`,
      { method: 'POST' }
    );
    
    // Invalidate relevant caches
    frontendCache.deletePattern('config');
    frontendCache.deletePattern('show');
    
    return result;
  },
  
  async deleteConfig(path: string, value?: string): Promise<ApiResponse<any>> {
    const result = await apiClient<ApiResponse<any>>(
      `/configure/delete/${path}${value ? `?value=${encodeURIComponent(value)}` : ''}`,
      { method: 'POST' }
    );
    
    // Invalidate relevant caches
    frontendCache.deletePattern('config');
    frontendCache.deletePattern('show');
    
    return result;
  },
  
  // DHCP Leases
  async getDHCPLeases(): Promise<DHCPLeasesResponse> {
    return apiClient<DHCPLeasesResponse>('/dhcp/leases');
  },
  
  // Routing Table
  async getRoutingTable(): Promise<RoutingTableResponse> {
    return apiClient<RoutingTableResponse>('/routingtable');
  },
  
  // Show operations
  async showCommand(path: string): Promise<any> {
    return apiClient(`/show/${path}`);
  },
  
  // Check for unsaved changes
  async checkUnsavedChanges(): Promise<{ success: boolean; data: boolean; error: string | null }> {
    return apiClient<{ success: boolean; data: boolean; error: string | null }>('/check-unsaved-changes');
  },
  
  // Save configuration
  async saveConfig(file?: string): Promise<ApiResponse<any>> {
    const params = file ? `?file=${encodeURIComponent(file)}` : '';
    const result = await apiClient<ApiResponse<any>>(`/config-file/save${params}`, { method: 'POST' });
    
    // Invalidate config cache
    frontendCache.deletePattern('config');
    
    return result;
  },
  
  // Load configuration
  async loadConfig(file: string): Promise<ApiResponse<any>> {
    const result = await apiClient<ApiResponse<any>>(
      `/config-file/load?file=${encodeURIComponent(file)}`,
      { method: 'POST' }
    );
    
    // Invalidate all caches
    frontendCache.clear();
    
    return result;
  },
  
  // Cache management
  async getCacheStats(): Promise<CacheStatsResponse> {
    return apiClient<CacheStatsResponse>('/cache/stats');
  },
  
  async clearCache(pattern?: string): Promise<ClearCacheResponse> {
    const params = pattern ? `?pattern=${encodeURIComponent(pattern)}` : '';
    return apiClient<ClearCacheResponse>(`/cache/clear${params}`, { method: 'POST' });
  }
}; 