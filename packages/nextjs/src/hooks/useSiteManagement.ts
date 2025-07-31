/**
 * React Hook for Site Management with Live Updates
 * Provides real-time site management capabilities using our hybrid Supabase/Convex system
 */

import { useState, useEffect, useCallback } from 'react';
import { siteManagement, type Site, type SiteStatus, type SiteAnalytics } from '@/lib/site-management-client';
import { useSpoolLiveUpdates } from './useSpoolLiveUpdates';

export interface UseSiteManagementOptions {
  siteId?: string;
  enableLiveUpdates?: boolean;
  refreshInterval?: number; // in milliseconds
}

export interface SiteManagementState {
  // Data
  sites: Site[];
  currentSite: Site | null;
  status: SiteStatus | null;
  analytics: SiteAnalytics | null;
  dashboard: any | null;
  
  // Loading states
  loading: {
    sites: boolean;
    status: boolean;
    analytics: boolean;
    dashboard: boolean;
    actions: boolean;
  };
  
  // Error states
  errors: {
    sites: string | null;
    status: string | null;
    analytics: string | null;
    dashboard: string | null;
    actions: string | null;
  };
  
  // Live updates
  liveUpdates: {
    connected: boolean;
    lastUpdate: string | null;
    activeConnections: number;
  };
}

export interface SiteManagementActions {
  // Data fetching
  refreshSites: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshAnalytics: (period?: '1d' | '7d' | '30d' | '90d') => Promise<void>;
  refreshDashboard: () => Promise<void>;
  
  // Site operations
  createSite: (data: { name: string; domain?: string; settings?: Record<string, any> }) => Promise<Site>;
  updateSite: (data: { name?: string; domain?: string; settings?: Record<string, any> }) => Promise<Site>;
  deleteSite: () => Promise<void>;
  regenerateApiKey: () => Promise<string>;
  
  // Sync operations
  syncToConvex: (action?: 'sync' | 'remove' | 'reset') => Promise<void>;
  checkSyncStatus: () => Promise<any>;
  
  // Utility
  selectSite: (siteId: string) => void;
  clearErrors: () => void;
}

export function useSiteManagement(options: UseSiteManagementOptions = {}): [SiteManagementState, SiteManagementActions] {
  const { siteId, enableLiveUpdates = true, refreshInterval = 30000 } = options;
  
  // State
  const [state, setState] = useState<SiteManagementState>({
    sites: [],
    currentSite: null,
    status: null,
    analytics: null,
    dashboard: null,
    loading: {
      sites: false,
      status: false,
      analytics: false,
      dashboard: false,
      actions: false,
    },
    errors: {
      sites: null,
      status: null,
      analytics: null,
      dashboard: null,
      actions: null,
    },
    liveUpdates: {
      connected: false,
      lastUpdate: null,
      activeConnections: 0,
    },
  });

  // Live updates hook (only if siteId is provided and enabled)
  const liveUpdatesResult = useSpoolLiveUpdates(
    enableLiveUpdates && siteId ? {
      apiKey: '', // Will be populated from site data
      siteId,
      onUpdate: (update) => {
        // Refresh relevant data when live updates are received
        if (update.type === 'content') {
          refreshStatus();
          refreshDashboard();
        }
      },
    } : null
  );

  // Update live updates state
  useEffect(() => {
    if (liveUpdatesResult) {
      setState(prev => ({
        ...prev,
        liveUpdates: {
          connected: liveUpdatesResult.isConnected,
          lastUpdate: liveUpdatesResult.lastUpdate,
          activeConnections: 0, // This would come from the status API
        },
      }));
    }
  }, [liveUpdatesResult?.isConnected, liveUpdatesResult?.lastUpdate]);

  // Helper function to update loading state
  const setLoading = useCallback((key: keyof SiteManagementState['loading'], value: boolean) => {
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, [key]: value },
    }));
  }, []);

  // Helper function to set error
  const setError = useCallback((key: keyof SiteManagementState['errors'], error: string | null) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [key]: error },
    }));
  }, []);

  // Fetch sites
  const refreshSites = useCallback(async () => {
    setLoading('sites', true);
    setError('sites', null);
    
    try {
      const { sites } = await siteManagement.listSites();
      setState(prev => ({
        ...prev,
        sites,
        currentSite: siteId ? sites.find(s => s.id === siteId) || prev.currentSite : prev.currentSite,
      }));
    } catch (error) {
      setError('sites', error instanceof Error ? error.message : 'Failed to fetch sites');
    } finally {
      setLoading('sites', false);
    }
  }, [siteId, setLoading, setError]);

  // Fetch status
  const refreshStatus = useCallback(async () => {
    if (!siteId) return;
    
    setLoading('status', true);
    setError('status', null);
    
    try {
      const status = await siteManagement.getSiteStatus(siteId);
      setState(prev => ({
        ...prev,
        status,
        liveUpdates: {
          ...prev.liveUpdates,
          activeConnections: status.live_updates.active_connections,
        },
      }));
    } catch (error) {
      setError('status', error instanceof Error ? error.message : 'Failed to fetch status');
    } finally {
      setLoading('status', false);
    }
  }, [siteId, setLoading, setError]);

  // Fetch analytics
  const refreshAnalytics = useCallback(async (period: '1d' | '7d' | '30d' | '90d' = '7d') => {
    if (!siteId) return;
    
    setLoading('analytics', true);
    setError('analytics', null);
    
    try {
      const analytics = await siteManagement.getSiteAnalytics(siteId, { period });
      setState(prev => ({ ...prev, analytics }));
    } catch (error) {
      setError('analytics', error instanceof Error ? error.message : 'Failed to fetch analytics');
    } finally {
      setLoading('analytics', false);
    }
  }, [siteId, setLoading, setError]);

  // Fetch dashboard
  const refreshDashboard = useCallback(async () => {
    if (!siteId) return;
    
    setLoading('dashboard', true);
    setError('dashboard', null);
    
    try {
      const dashboard = await siteManagement.getDashboard(siteId);
      setState(prev => ({ ...prev, dashboard }));
    } catch (error) {
      setError('dashboard', error instanceof Error ? error.message : 'Failed to fetch dashboard');
    } finally {
      setLoading('dashboard', false);
    }
  }, [siteId, setLoading, setError]);

  // Create site
  const createSite = useCallback(async (data: { name: string; domain?: string; settings?: Record<string, any> }) => {
    setLoading('actions', true);
    setError('actions', null);
    
    try {
      const { site } = await siteManagement.createSite(data);
      await refreshSites(); // Refresh the sites list
      return site;
    } catch (error) {
      setError('actions', error instanceof Error ? error.message : 'Failed to create site');
      throw error;
    } finally {
      setLoading('actions', false);
    }
  }, [refreshSites, setLoading, setError]);

  // Update site
  const updateSite = useCallback(async (data: { name?: string; domain?: string; settings?: Record<string, any> }) => {
    if (!siteId) throw new Error('No site selected');
    
    setLoading('actions', true);
    setError('actions', null);
    
    try {
      const site = await siteManagement.updateSiteSettings(siteId, data);
      setState(prev => ({ ...prev, currentSite: site }));
      await refreshSites(); // Refresh the sites list
      return site;
    } catch (error) {
      setError('actions', error instanceof Error ? error.message : 'Failed to update site');
      throw error;
    } finally {
      setLoading('actions', false);
    }
  }, [siteId, refreshSites, setLoading, setError]);

  // Delete site
  const deleteSite = useCallback(async () => {
    if (!siteId) throw new Error('No site selected');
    
    setLoading('actions', true);
    setError('actions', null);
    
    try {
      await siteManagement.deleteSite(siteId);
      setState(prev => ({
        ...prev,
        currentSite: null,
        status: null,
        analytics: null,
        dashboard: null,
      }));
      await refreshSites(); // Refresh the sites list
    } catch (error) {
      setError('actions', error instanceof Error ? error.message : 'Failed to delete site');
      throw error;
    } finally {
      setLoading('actions', false);
    }
  }, [siteId, refreshSites, setLoading, setError]);

  // Regenerate API key
  const regenerateApiKey = useCallback(async () => {
    if (!siteId) throw new Error('No site selected');
    
    setLoading('actions', true);
    setError('actions', null);
    
    try {
      const { api_key } = await siteManagement.regenerateApiKey(siteId);
      await refreshSites(); // Refresh to get updated site data
      await refreshStatus(); // Refresh status to update sync info
      return api_key;
    } catch (error) {
      setError('actions', error instanceof Error ? error.message : 'Failed to regenerate API key');
      throw error;
    } finally {
      setLoading('actions', false);
    }
  }, [siteId, refreshSites, refreshStatus, setLoading, setError]);

  // Sync to Convex
  const syncToConvex = useCallback(async (action: 'sync' | 'remove' | 'reset' = 'sync') => {
    if (!siteId) throw new Error('No site selected');
    
    setLoading('actions', true);
    setError('actions', null);
    
    try {
      await siteManagement.syncSite(siteId, action);
      await refreshStatus(); // Refresh status to show updated sync info
    } catch (error) {
      setError('actions', error instanceof Error ? error.message : `Failed to ${action} site`);
      throw error;
    } finally {
      setLoading('actions', false);
    }
  }, [siteId, refreshStatus, setLoading, setError]);

  // Check sync status
  const checkSyncStatus = useCallback(async () => {
    if (!siteId) throw new Error('No site selected');
    
    try {
      return await siteManagement.getSyncStatus(siteId);
    } catch (error) {
      setError('actions', error instanceof Error ? error.message : 'Failed to check sync status');
      throw error;
    }
  }, [siteId, setError]);

  // Select site
  const selectSite = useCallback((newSiteId: string) => {
    const site = state.sites.find(s => s.id === newSiteId);
    setState(prev => ({
      ...prev,
      currentSite: site || null,
      status: null,
      analytics: null,
      dashboard: null,
    }));
  }, [state.sites]);

  // Clear errors
  const clearErrors = useCallback(() => {
    setState(prev => ({
      ...prev,
      errors: {
        sites: null,
        status: null,
        analytics: null,
        dashboard: null,
        actions: null,
      },
    }));
  }, []);

  // Auto-refresh data
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        if (siteId) {
          refreshStatus();
        }
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [siteId, refreshInterval, refreshStatus]);

  // Initial data load
  useEffect(() => {
    refreshSites();
  }, [refreshSites]);

  // Load site-specific data when siteId changes
  useEffect(() => {
    if (siteId) {
      refreshStatus();
      refreshDashboard();
    }
  }, [siteId, refreshStatus, refreshDashboard]);

  const actions: SiteManagementActions = {
    refreshSites,
    refreshStatus,
    refreshAnalytics,
    refreshDashboard,
    createSite,
    updateSite,
    deleteSite,
    regenerateApiKey,
    syncToConvex,
    checkSyncStatus,
    selectSite,
    clearErrors,
  };

  return [state, actions];
}

export default useSiteManagement;