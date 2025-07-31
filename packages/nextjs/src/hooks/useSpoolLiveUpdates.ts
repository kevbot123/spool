/**
 * Spool Live Updates Hook - Convex Version
 * This provides real-time content updates for customer Next.js apps
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ConvexReactClient, useQuery } from 'convex/react';

// Spool's Convex deployment URL (embedded in package)
// This will be set to your actual Convex deployment URL
const SPOOL_CONVEX_URL = process.env.NEXT_PUBLIC_SPOOL_CONVEX_URL || 'https://your-convex-deployment.convex.cloud';

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
  apiKey: string;
  siteId: string;
  onUpdate?: (update: LiveUpdate) => void;
  enabled?: boolean;
}

/**
 * Hook for subscribing to Spool live updates
 * This is what customers will use in their Next.js apps
 */
export function useSpoolLiveUpdates(config: UseSpoolLiveUpdatesConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const onUpdateRef = useRef(config.onUpdate);
  
  // Update the callback ref when it changes
  useEffect(() => {
    onUpdateRef.current = config.onUpdate;
  }, [config.onUpdate]);

  // Subscribe to live updates via Convex
  // Note: This will need to be updated with the actual API reference once Convex is deployed
  const updates = useQuery(
    'liveUpdates:subscribe' as any,
    config.enabled !== false ? {
      siteId: config.siteId,
      apiKey: config.apiKey,
      limit: 10,
    } : 'skip'
  );

  // Handle connection state
  useEffect(() => {
    if (updates !== undefined) {
      setIsConnected(true);
      setError(null);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] ✅ Connected to Spool Realtime for site: ${config.siteId}`);
      }
    }
  }, [updates, config.siteId]);

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

  // Handle errors
  useEffect(() => {
    // Convex will throw errors if authentication fails
    // We can catch them here and provide user-friendly messages
    if (updates === undefined && config.enabled !== false) {
      // Still loading, not an error yet
      return;
    }
  }, [updates, config.enabled]);

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
 * Provider component for Convex
 * Customers need to wrap their app with this
 * 
 * Usage:
 * import { SpoolLiveUpdatesProvider } from '@spoolcms/nextjs';
 * 
 * <SpoolLiveUpdatesProvider>
 *   <YourApp />
 * </SpoolLiveUpdatesProvider>
 */
export function SpoolLiveUpdatesProvider({ children }: { children: React.ReactNode }) {
  // For now, just return children - customers will need to set up ConvexProvider themselves
  // This avoids TypeScript compilation issues while still providing the hook
  console.warn('[SpoolLiveUpdates] Please wrap your app with ConvexProvider from convex/react');
  return children as React.ReactElement;
}