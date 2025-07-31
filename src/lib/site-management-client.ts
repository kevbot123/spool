/**
 * Client-side Site Management Utilities
 * Provides helper functions for interacting with site management APIs
 */

export interface Site {
  id: string;
  name: string;
  domain?: string;
  api_key: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  role?: string;
  is_owner?: boolean;
}

export interface SiteStatus {
  site: {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
  };
  health: {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  content: {
    total: number;
    published: number;
    draft: number;
    recent_activity: number;
  };
  collections: {
    total: number;
  };
  live_updates: {
    connected: boolean;
    active_connections: number;
    last_sync: string | null;
    error: string | null;
  };
  api: {
    key_exists: boolean;
    key_prefix: string | null;
  };
  last_checked: string;
}

export interface SiteActivity {
  id: string;
  type: 'content';
  action: 'created' | 'updated' | 'published';
  collection: string;
  collection_slug: string;
  slug: string;
  status: string;
  timestamp: string;
}

export interface SiteAnalytics {
  site: {
    id: string;
    name: string;
    created_at: string;
  };
  period: {
    start: string;
    end: string;
    days: number;
  };
  summary: {
    content_created: number;
    content_updated: number;
    content_published: number;
    avg_daily_activity: number;
  };
  daily_activity: Array<{
    date: string;
    created: number;
    updated: number;
    published: number;
  }>;
  collections: Array<{
    name: string;
    slug: string;
    total_items: number;
    published_items: number;
    draft_items: number;
    recent_items: number;
  }>;
  live_updates: {
    total_updates: number;
    unique_connections: number;
    avg_connection_time: number;
    peak_concurrent_connections: number;
    error_rate: number;
  };
  generated_at: string;
}

export class SiteManagementClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/admin/sites') {
    this.baseUrl = baseUrl;
  }

  /**
   * List all sites for the current user
   */
  async listSites(): Promise<{ sites: Site[] }> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sites: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Create a new site
   */
  async createSite(data: {
    name: string;
    domain?: string;
    settings?: Record<string, any>;
  }): Promise<{ site: Site }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to create site: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get site status and health information
   */
  async getSiteStatus(siteId: string): Promise<SiteStatus> {
    const response = await fetch(`${this.baseUrl}/${siteId}/status`);
    if (!response.ok) {
      throw new Error(`Failed to fetch site status: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get site activity feed
   */
  async getSiteActivity(siteId: string, options?: {
    limit?: number;
    since?: string;
  }): Promise<{
    site: { id: string; name: string };
    activity: SiteActivity[];
    stats: {
      total_items: number;
      live_updates: any;
      last_updated: string | null;
    };
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.since) params.set('since', options.since);

    const url = `${this.baseUrl}/${siteId}/activity${params.toString() ? `?${params}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch site activity: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get site analytics
   */
  async getSiteAnalytics(siteId: string, options?: {
    period?: '1d' | '7d' | '30d' | '90d';
    timezone?: string;
  }): Promise<SiteAnalytics> {
    const params = new URLSearchParams();
    if (options?.period) params.set('period', options.period);
    if (options?.timezone) params.set('timezone', options.timezone);

    const url = `${this.baseUrl}/${siteId}/analytics${params.toString() ? `?${params}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch site analytics: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboard(siteId: string): Promise<{
    site: Site & { settings: Record<string, any> };
    user: {
      role: string;
      permissions: {
        can_edit: boolean;
        can_manage: boolean;
        can_delete: boolean;
      };
    };
    stats: {
      content: { total: number; published: number; draft: number };
      collections: number;
      collaborators: number;
      recent_activity: number;
    };
    health: {
      content_health: number;
      activity_score: number;
      live_updates_health: number;
      overall_health: number;
    };
    live_updates: {
      connected: boolean;
      active_connections: number;
      last_sync: string | null;
      total_updates_today: number;
      error: string | null;
    };
    collections: Array<{
      id: string;
      name: string;
      slug: string;
      total_items: number;
      published_items: number;
      draft_items: number;
      created_at: string;
      schema_fields: number;
    }>;
    recent_activity: SiteActivity[];
    api: {
      key_exists: boolean;
      key_preview: string | null;
    };
    generated_at: string;
  }> {
    const response = await fetch(`${this.baseUrl}/${siteId}/dashboard`);
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Update site settings
   */
  async updateSiteSettings(siteId: string, data: {
    name?: string;
    domain?: string;
    settings?: Record<string, any>;
  }): Promise<Site> {
    const response = await fetch(`${this.baseUrl}/${siteId}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update site settings: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Regenerate API key
   */
  async regenerateApiKey(siteId: string): Promise<{ api_key: string }> {
    const response = await fetch(`${this.baseUrl}/${siteId}/regenerate-api-key`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to regenerate API key: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Delete a site
   */
  async deleteSite(siteId: string): Promise<{ success: boolean; remainingSiteCount: number }> {
    const response = await fetch(`${this.baseUrl}/${siteId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete site: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Sync site to Convex
   */
  async syncSite(siteId: string, action: 'sync' | 'remove' | 'reset' = 'sync'): Promise<{
    success: boolean;
    message: string;
    details: Record<string, any>;
  }> {
    const response = await fetch(`${this.baseUrl}/${siteId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to ${action} site`);
    }
    return response.json();
  }

  /**
   * Get sync status
   */
  async getSyncStatus(siteId: string): Promise<{
    site: { id: string; name: string; last_updated: string };
    convex: {
      exists: boolean;
      last_sync: string | null;
      is_synced: boolean;
      needs_sync: boolean;
      error: string | null;
    };
    recommendations: Array<{
      action: string;
      message: string;
      priority: 'low' | 'medium' | 'high';
    }>;
    checked_at: string;
  }> {
    const response = await fetch(`${this.baseUrl}/${siteId}/sync`);
    if (!response.ok) {
      throw new Error(`Failed to get sync status: ${response.statusText}`);
    }
    return response.json();
  }
}

// Export a default instance
export const siteManagement = new SiteManagementClient();

// Utility functions for common operations
export const siteUtils = {
  /**
   * Format health score as a readable status
   */
  formatHealthStatus(score: number): { status: string; color: string; description: string } {
    if (score >= 80) {
      return {
        status: 'Healthy',
        color: 'green',
        description: 'Site is performing well'
      };
    } else if (score >= 60) {
      return {
        status: 'Warning',
        color: 'yellow',
        description: 'Site needs attention'
      };
    } else {
      return {
        status: 'Critical',
        color: 'red',
        description: 'Site requires immediate attention'
      };
    }
  },

  /**
   * Format activity timestamp as relative time
   */
  formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return time.toLocaleDateString();
  },

  /**
   * Get activity action color
   */
  getActivityColor(action: string): string {
    switch (action) {
      case 'created': return 'blue';
      case 'updated': return 'orange';
      case 'published': return 'green';
      default: return 'gray';
    }
  },

  /**
   * Calculate content completion percentage
   */
  calculateContentCompletion(published: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((published / total) * 100);
  },
};