/**
 * React hooks for Spool CMS client components
 * Provides loading states, error handling, and automatic refetching
 */

import { useState, useEffect, useCallback } from 'react';
import { SpoolConfig } from '../types';
import { getSpoolContent, ContentOptions } from '../utils/content';

export interface UseSpoolContentResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * React hook for fetching Spool content in client components
 * Provides loading states and error handling
 */
export function useSpoolContent<T = any>(
  config: SpoolConfig,
  collection: string,
  slug?: string,
  options?: ContentOptions
): UseSpoolContentResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getSpoolContent<T>(config, collection, slug, options);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [config, collection, slug, options]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}

/**
 * React hook for fetching Spool collections in client components
 */
export function useSpoolCollections(config: SpoolConfig) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { getSpoolCollections } = await import('../utils/content');
      const result = await getSpoolCollections(config);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [config]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}