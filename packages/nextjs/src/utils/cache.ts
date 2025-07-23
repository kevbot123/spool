/**
 * Request deduplication and caching utilities for Spool CMS
 * Provides different caching strategies for server and client contexts
 */

// React cache is only available in React 18+ canary builds
// For now, we'll implement our own server-side caching
// import { cache } from 'react';
import { detectEnvironment, getEnvironmentCacheKey } from './environment';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
}

/**
 * Default cache options
 */
const DEFAULT_CACHE_OPTIONS: Required<CacheOptions> = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100, // 100 entries
};

/**
 * Client-side cache implementation using Map with TTL
 */
class ClientCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private options: Required<CacheOptions>;

  constructor(options?: CacheOptions) {
    this.options = { ...DEFAULT_CACHE_OPTIONS, ...options };
  }

  get(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.options.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry;
  }

  set(key: string, data: T): void {
    // Clean up expired entries if cache is getting full
    if (this.cache.size >= this.options.maxSize) {
      this.cleanup();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  setPromise(key: string, promise: Promise<T>): void {
    this.cache.set(key, {
      data: null as any, // Will be replaced when promise resolves
      timestamp: Date.now(),
      promise,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.options.ttl) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    // If still too full, remove oldest entries
    if (this.cache.size >= this.options.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, Math.floor(this.options.maxSize * 0.2));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }
}

/**
 * Global client-side cache instance
 */
const clientCache = new ClientCache();

/**
 * Server-side cached fetch function
 * For now, we'll use a simple Map-based cache until React cache() is stable
 */
const serverCache = new Map<string, { data: any; timestamp: number }>();

const serverCachedFetch = async (url: string, options: RequestInit): Promise<Response> => {
  const cacheKey = `${url}:${JSON.stringify(options)}`;
  const cached = serverCache.get(cacheKey);
  
  // Simple 5-minute cache for server-side requests
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    // Return a new Response with the cached data to avoid "Body is unusable" error
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const response = await fetch(url, options);
  
  // Only cache successful responses
  if (response.ok) {
    try {
      // Parse and cache the JSON data, not the Response object
      const data = await response.clone().json();
      serverCache.set(cacheKey, { data, timestamp: Date.now() });
    } catch (error) {
      // If JSON parsing fails, don't cache
      console.warn('Failed to parse response for caching:', error);
    }
  }
  
  return response;
};

/**
 * Generate a cache key for a request
 */
export function generateCacheKey(
  baseUrl: string,
  siteId: string,
  collection: string,
  slug?: string,
  options?: any
): string {
  const envKey = getEnvironmentCacheKey();
  const optionsKey = options ? JSON.stringify(options) : '';
  const slugKey = slug || 'collection';
  
  return `${envKey}:${baseUrl}:${siteId}:${collection}:${slugKey}:${optionsKey}`;
}

/**
 * Unified caching interface that works in both server and client contexts
 */
export class UnifiedCache<T> {
  private environment = detectEnvironment();

  async get(key: string): Promise<T | null> {
    if (this.environment.isClient) {
      const entry = clientCache.get(key) as CacheEntry<T> | null;
      return entry?.data || null;
    }
    
    // Server-side: no persistent cache, rely on server cache for deduplication
    return null;
  }

  async set(key: string, data: T): Promise<void> {
    if (this.environment.isClient) {
      clientCache.set(key, data);
    }
    
    // Server-side: no action needed, React cache() handles deduplication
  }

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    if (this.environment.isClient) {
      // Client-side: check cache first
      const cached = clientCache.get(key) as CacheEntry<T> | null;
      
      if (cached) {
        // If we have a promise, wait for it
        if (cached.promise) {
          return cached.promise as Promise<T>;
        }
        
        // If we have data, return it
        if (cached.data) {
          return cached.data as T;
        }
      }
      
      // No cache hit, create new request
      const promise = fetcher();
      (clientCache as any).setPromise(key, promise);
      
      try {
        const data = await promise;
        (clientCache as any).set(key, data);
        return data;
      } catch (error) {
        // Remove failed promise from cache
        clientCache.clear();
        throw error;
      }
    } else {
      // Server-side: rely on server cache for deduplication
      return fetcher();
    }
  }

  clear(): void {
    if (this.environment.isClient) {
      clientCache.clear();
    }
  }
}

/**
 * Create a cached fetch function that works in both server and client contexts
 */
export function createCachedFetch() {
  const environment = detectEnvironment();
  
  if (environment.isServer) {
    // Use React's cache() for server-side deduplication
    return serverCachedFetch;
  } else {
    // Use regular fetch for client-side (caching handled at higher level)
    return fetch;
  }
}

/**
 * Global cache instance
 */
export const globalCache = new UnifiedCache();

/**
 * Clear all caches (useful for testing)
 */
export function clearAllCaches(): void {
  globalCache.clear();
}