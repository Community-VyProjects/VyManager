import { frontendCache } from './cache';
import { api } from './api';

// List of essential data to preload
const ESSENTIAL_DATA = [
  { key: 'config:root', fetcher: () => api.getConfig(), ttl: 30 },
  { key: 'routing:table', fetcher: () => api.getRoutingTable(), ttl: 60 },
  { key: 'dhcp:leases', fetcher: () => api.getDHCPLeases(), ttl: 60 },
  { key: 'system:unsaved', fetcher: () => api.checkUnsavedChanges(), ttl: 10 },
];

// List of important but non-blocking data
const IMPORTANT_DATA = [
  { key: 'config:interfaces', fetcher: () => api.getConfig('interfaces'), ttl: 30 },
  { key: 'config:firewall', fetcher: () => api.getConfig('firewall'), ttl: 30 },
  { key: 'config:services', fetcher: () => api.getConfig('service'), ttl: 30 },
];

/**
 * Simple retry mechanism for failed API calls
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    
    console.log(`Retrying after error: ${error instanceof Error ? error.message : String(error)}. Retries left: ${retries}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 1.5);
  }
}

/**
 * Initialize the cache with essential data
 * @returns Promise that resolves when all essential data is cached
 */
export async function initializeCache(): Promise<void> {
  if (frontendCache.isInitialized() || frontendCache.isInitializing()) {
    return;
  }

  try {
    console.log('🔄 Initializing cache with essential data...');
    frontendCache.setInitializing(true);
    
    // First, load essential data in parallel
    const essentialPromises = ESSENTIAL_DATA.map(async ({ key, fetcher, ttl }) => {
      try {
        // Use retry mechanism for essential data
        const data = await withRetry(fetcher, 2, 1000);
        frontendCache.set(key, data, ttl);
        console.log(`✅ Cached essential data: ${key}`);
        return { success: true, key };
      } catch (error) {
        console.error(`❌ Failed to cache essential data: ${key}`, error);
        // For essential data, still return success so app can continue
        // But store the error in cache so components can handle gracefully
        frontendCache.set(key, { error: error instanceof Error ? error.message : String(error) }, ttl);
        return { success: false, key, error };
      }
    });
    
    const results = await Promise.all(essentialPromises);
    const failedCount = results.filter(r => !r.success).length;
    
    if (failedCount > 0) {
      console.warn(`⚠️ ${failedCount} essential items failed to load. App may have limited functionality.`);
    }
    
    // Still proceed with loading important data in the background
    setTimeout(() => {
      const backgroundLoading = async () => {
        const importantPromises = IMPORTANT_DATA.map(async ({ key, fetcher, ttl }) => {
          try {
            const data = await fetcher();
            frontendCache.set(key, data, ttl);
            console.log(`✅ Cached important data: ${key}`);
            return { success: true, key };
          } catch (error) {
            console.error(`❌ Failed to cache important data: ${key}`, error);
            return { success: false, key, error };
          }
        });
        
        await Promise.all(importantPromises);
        console.log('✅ Background data loading complete');
      };
      
      backgroundLoading().catch(error => {
        console.error('❌ Background data loading error:', error);
      });
    }, 100);
    
    console.log('✅ Cache initialization complete');
    frontendCache.setInitialized(true);
  } catch (error) {
    console.error('❌ Cache initialization failed:', error);
    frontendCache.setInitializing(false);
    throw error;
  }
}

/**
 * Refresh all cached data
 */
export async function refreshCache(): Promise<void> {
  console.log('🔄 Refreshing cache...');
  
  const allData = [...ESSENTIAL_DATA, ...IMPORTANT_DATA];
  
  const refreshPromises = allData.map(async ({ key, fetcher, ttl }) => {
    try {
      const data = await fetcher();
      frontendCache.set(key, data, ttl);
      console.log(`✅ Refreshed cache: ${key}`);
      return { success: true, key };
    } catch (error) {
      console.error(`❌ Failed to refresh cache: ${key}`, error);
      return { success: false, key, error };
    }
  });
  
  await Promise.all(refreshPromises);
  console.log('✅ Cache refresh complete');
} 