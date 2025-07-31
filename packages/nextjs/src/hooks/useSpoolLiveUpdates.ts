/**
 * Spool Live Updates Hook - Convex Version
 * This provides real-time content updates for customer Next.js apps
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ConvexReactClient, useQuery } from 'convex/react';

// Spool's Convex deployment URL (hardcoded - customers don't need to configure this)
const SPOOL_CONVEX_URL = 'https://sincere-hyena-934.convex.cloud';

// Global Convex client instance
let convexClient: ConvexReactClient | null = null;

function getConvexClient() {
  if (!convexClient) {
    convexClient = new ConvexReactClient(SPOOL_CONVEX_URL);
  }
  return convexClient;
}

export interface LiveUpdate {
  _id: string;
  siteId: string;
  event: 'content.created' | 'content.updated' | 'content.published' | 'content.deleted';
  collection: string;
  slug?: string;
  itemId: string;
  metadata?: {
    title?: string;
    author?: string;
    tags?: string[];
  };
  timestamp: number;
}

export interface UseSpoolLiveUpdatesConfig {
  apiKey?: string; // Optional - will auto-detect from env
  siteId?: string; // Optional - will auto-detect from env
  onUpdate?: (update: LiveUpdate) => void;
  enabled?: boolean;
}

/**
 * Hook for subscribing to Spool live updates
 * This is what customers will use in their Next.js apps
 */
export function useSpoolLiveUpdates(config: UseSpoolLiveUpdatesConfig = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const onUpdateRef = useRef(config.onUpdate);

  // Auto-detect credentials from environment
  const apiKey = config.apiKey || 
    (typeof window !== 'undefined' ? 
      (window as any).__NEXT_DATA__?.props?.pageProps?.env?.NEXT_PUBLIC_SPOOL_API_KEY || 
      process.env.NEXT_PUBLIC_SPOOL_API_KEY 
    : null);
  
  const siteId = config.siteId || 
    (typeof window !== 'undefined' ? 
      (window as any).__NEXT_DATA__?.props?.pageProps?.env?.NEXT_PUBLIC_SPOOL_SITE_ID ||
      process.env.NEXT_PUBLIC_SPOOL_SITE_ID
    : null);
  
  // Update the callback ref when it changes
  useEffect(() => {
    onUpdateRef.current = config.onUpdate;
  }, [config.onUpdate]);

  // Subscribe to live updates via Convex
  // Note: Function name format for external deployment access
  const updates = useQuery(
    'liveUpdates:subscribe' as any,
    config.enabled !== false && apiKey && siteId ? {
      siteId,
      apiKey,
      limit: 10,
    } : 'skip'
  );

  // Handle connection state
  useEffect(() => {
    if (updates !== undefined) {
      setIsConnected(true);
      setError(null);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] ✅ Connected to Spool Realtime for site: ${siteId}`);
        console.log(`[DEV] 📊 Updates received:`, updates);
      }
    }
  }, [updates, siteId]);

  // Handle new updates
  useEffect(() => {
    if (!updates || updates.length === 0) return;

    // Find new updates since last check
    const newUpdates = updates.filter((update: any) => update.timestamp > lastTimestampRef.current);
    
    if (newUpdates.length > 0) {
      // Update last timestamp
      lastTimestampRef.current = Math.max(...newUpdates.map((u: any) => u.timestamp));
      
      // Process each new update
      newUpdates.forEach((update: any) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEV] 🔄 Live update: ${update.collection}/${update.slug || 'no-slug'}`);
        }
        
        // Call user's callback
        if (onUpdateRef.current) {
          onUpdateRef.current(update);
        }
        
        // Trigger automatic revalidation
        handleAutomaticRevalidation(update);
      });
    }
  }, [updates]);

  // Handle errors and debug info
  useEffect(() => {
    // Debug logging for connection issues
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] 🔍 Debug info:`, {
        apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'missing',
        siteId: siteId || 'missing',
        enabled: config.enabled !== false,
        updatesState: updates === undefined ? 'undefined' : Array.isArray(updates) ? `array(${updates.length})` : typeof updates
      });
    }
    
    // Convex will throw errors if authentication fails
    // We can catch them here and provide user-friendly messages
    if (updates === undefined && config.enabled !== false && apiKey && siteId) {
      // Still loading, not an error yet
      return;
    }
  }, [updates, config.enabled, apiKey, siteId]);

  return {
    isConnected,
    error,
    updates: updates || [],
    latestUpdate: updates?.[0] || null,
  };
}

/**
 * Automatic revalidation logic
 * This handles cache invalidation when content updates
 */
async function handleAutomaticRevalidation(update: LiveUpdate) {
  if (typeof window !== 'undefined') {
    // Client-side: trigger router refresh
    if ('router' in window && typeof (window as any).router?.refresh === 'function') {
      (window as any).router.refresh();
    }
    return;
  }

  // Server-side: trigger revalidation via HTTP
  try {
    const baseUrl = getAppBaseUrl();
    const pathsToRevalidate = generateRevalidationPaths(update);
    
    // Wait 2 seconds for API propagation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const revalidationPromises = pathsToRevalidate.map(async (path) => {
      try {
        const response = await fetch(`${baseUrl}/api/revalidate?path=${encodeURIComponent(path)}`, {
          method: 'POST',
          headers: {
            'Cache-Control': 'no-cache',
          },
          signal: AbortSignal.timeout(5000),
        });
        
        if (response.ok) {
          console.log(`[DEV] ✅ Revalidated: ${path}`);
        } else {
          console.log(`[DEV] ❌ Revalidation failed for ${path}: ${response.status}`);
        }
      } catch (err) {
        console.log(`[DEV] ❌ Revalidation error for ${path}:`, err instanceof Error ? err.message : String(err));
      }
    });
    
    await Promise.allSettled(revalidationPromises);
    
  } catch (error) {
    console.error('[DEV] Error in automatic revalidation:', error);
  }
}

/**
 * Generate paths that need revalidation based on the update
 */
function generateRevalidationPaths(update: LiveUpdate): string[] {
  const paths = [];
  
  // Always revalidate root
  paths.push('/');
  
  // Collection-specific paths
  if (update.collection === 'blog') {
    paths.push('/blog');
    if (update.slug) {
      paths.push(`/blog/${update.slug}`);
    }
  } else {
    paths.push(`/${update.collection}`);
    if (update.slug) {
      paths.push(`/${update.collection}/${update.slug}`);
    }
  }
  
  // Common paths
  paths.push('/sitemap.xml');
  
  return paths;
}

/**
 * Detect the current app URL
 */
function getAppBaseUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || process.env.NEXT_PUBLIC_PORT || '3000';
    return `http://localhost:${port}`;
  }
  
  return process.env.NEXT_PUBLIC_SITE_URL || 
         process.env.NEXT_PUBLIC_APP_URL || 
         (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
}

/**
 * Provider component that automatically sets up Convex connection to Spool's infrastructure
 * Customers just need to wrap their app with this - no additional configuration required!
 * 
 * Usage:
 * import { SpoolLiveUpdatesProvider } from '@spoolcms/nextjs';
 * 
 * <SpoolLiveUpdatesProvider>
 *   <YourApp />
 * </SpoolLiveUpdatesProvider>
 */
export function SpoolLiveUpdatesProvider({ children }: { children: React.ReactNode }) {
  const convexClient = getConvexClient();
  
  // Try to import ConvexProvider synchronously first
  let ConvexProvider: any = null;
  try {
    const convexReact = require('convex/react');
    ConvexProvider = convexReact.ConvexProvider;
  } catch (error) {
    // Convex not installed - provide fallback
    console.warn('[SpoolLiveUpdates] Convex not installed. Live updates disabled. Install with: npm install convex');
    return children as React.ReactElement;
  }
  
  if (!ConvexProvider) {
    console.warn('[SpoolLiveUpdates] ConvexProvider not available. Live updates disabled.');
    return children as React.ReactElement;
  }
  
  // Wrap with ConvexProvider using Spool's deployment
  return React.createElement(ConvexProvider, { client: convexClient }, children);
}