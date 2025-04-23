import { useState, useEffect } from 'react';

interface CacheItem<T> {
  value: T;
  timestamp: number;
  expiry: number;
}

class FrontendCache {
  private static instance: FrontendCache;
  private cache: Map<string, CacheItem<any>> = new Map();
  private listeners: Set<() => void> = new Set();
  private hitCount = 0;
  private missCount = 0;
  private creationTime = Date.now();
  private initialized = false;
  private initializing = false;

  private constructor() {}

  public static getInstance(): FrontendCache {
    if (!FrontendCache.instance) {
      FrontendCache.instance = new FrontendCache();
    }
    return FrontendCache.instance;
  }

  public get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.missCount++;
      return null;
    }
    
    // Check if the item has expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.missCount++;
      this.notifyListeners();
      return null;
    }
    
    this.hitCount++;
    return item.value as T;
  }

  public set<T>(key: string, value: T, ttl: number = 60): void {
    const expiry = Date.now() + ttl * 1000;
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      expiry,
    });
    this.notifyListeners();
  }

  public delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.notifyListeners();
    }
    return deleted;
  }

  public clear(): void {
    this.cache.clear();
    this.notifyListeners();
  }

  public deletePattern(pattern: string): number {
    let count = 0;
    
    // Convert keys to array to avoid iterator issues
    const keys = Array.from(this.cache.keys());
    
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    if (count > 0) {
      this.notifyListeners();
    }
    
    return count;
  }

  public getStats() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
    
    return {
      items: this.cache.size,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate,
      uptime: Math.floor((Date.now() - this.creationTime) / 1000),
      initialized: this.initialized,
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isInitializing(): boolean {
    return this.initializing;
  }

  public setInitialized(value: boolean): void {
    this.initialized = value;
    this.initializing = false;
    this.notifyListeners();
  }

  public setInitializing(value: boolean): void {
    this.initializing = value;
    this.notifyListeners();
  }
}

export const frontendCache = FrontendCache.getInstance();

export function useCache<T>(key: string, fetcher: () => Promise<T>, ttl: number = 60, dependencies: any[] = []): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(frontendCache.get<T>(key));
  const [loading, setLoading] = useState<boolean>(!data);
  const [error, setError] = useState<Error | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      frontendCache.set(key, result, ttl);
      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!data) {
      fetchData();
    }
  }, [key, ...dependencies]);

  // Subscribe to cache changes
  useEffect(() => {
    const unsubscribe = frontendCache.subscribe(() => {
      const cachedData = frontendCache.get<T>(key);
      if (cachedData !== data) {
        setData(cachedData);
      }
    });
    
    return unsubscribe;
  }, [key, data]);

  const refresh = async () => {
    await fetchData();
  };

  return { data, loading, error, refresh };
}

export function useCacheStats() {
  const [stats, setStats] = useState(frontendCache.getStats());
  
  useEffect(() => {
    const unsubscribe = frontendCache.subscribe(() => {
      setStats(frontendCache.getStats());
    });
    
    return unsubscribe;
  }, []);
  
  return stats;
}

export function clearCache(pattern?: string) {
  if (pattern) {
    frontendCache.deletePattern(pattern);
  } else {
    frontendCache.clear();
  }
} 