'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { frontendCache, useCacheStats } from '@/lib/cache';
import { initializeCache, refreshCache } from '@/lib/cache-init';

interface CacheContextType {
  isInitialized: boolean;
  isInitializing: boolean;
  stats: {
    items: number;
    hits: number;
    misses: number;
    hitRate: number;
    uptime: number;
  };
  refreshCache: () => Promise<void>;
  clearCache: (pattern?: string) => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export function useCacheContext() {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error('useCacheContext must be used within a CacheProvider');
  }
  return context;
}

interface CacheProviderProps {
  children: ReactNode;
}

export function CacheProvider({ children }: CacheProviderProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const stats = useCacheStats();

  // Initialize cache on component mount
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      try {
        await initializeCache();
        setIsInitialized(true);
      } catch (error) {
        console.error('Cache initialization error:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    if (!frontendCache.isInitialized() && !isInitialized && !isInitializing) {
      initialize();
    }

    // Subscribe to initialization state changes
    const unsubscribe = frontendCache.subscribe(() => {
      setIsInitialized(frontendCache.isInitialized());
      setIsInitializing(frontendCache.isInitializing());
    });

    return unsubscribe;
  }, [isInitialized, isInitializing]);

  // Set up a refresh interval (e.g., every 5 minutes)
  useEffect(() => {
    if (!isInitialized) return;

    const refreshInterval = setInterval(() => {
      refreshCache().catch(console.error);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, [isInitialized]);

  const clearCacheHandler = (pattern?: string) => {
    if (pattern) {
      frontendCache.deletePattern(pattern);
    } else {
      frontendCache.clear();
    }
  };

  const value: CacheContextType = {
    isInitialized,
    isInitializing,
    stats: {
      items: stats.items,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hitRate,
      uptime: stats.uptime,
    },
    refreshCache,
    clearCache: clearCacheHandler,
  };

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
} 