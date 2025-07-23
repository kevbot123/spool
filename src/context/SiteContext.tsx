'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, usePathname } from 'next/navigation';

interface Site {
  id: string;
  name: string;
  domain?: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  created_at: string;
}

interface SiteContextType {
  currentSite: Site | null;
  sites: Site[];
  isLoading: boolean;
  setCurrentSite: (site: Site) => void;
  refreshSites: () => Promise<void>;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [currentSite, setCurrentSite] = useState<Site | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchSites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSites([]);
        setCurrentSite(null);
        return;
      }

      // Get sites owned by user
      const { data: ownedSites } = await supabase
        .from('sites')
        .select('id, name, domain, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Get sites where user is a collaborator
      const { data: collaboratorSites } = await supabase
        .from('site_collaborators')
        .select(`
          role,
          accepted_at,
          site:sites!inner(
            id,
            name, 
            domain,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null);

      const allSites: Site[] = [
        ...(ownedSites || []).map(site => ({
          ...site,
          role: 'owner' as const
        })),
        ...(collaboratorSites || []).map((collab: any) => ({
          id: collab.site.id,
          name: collab.site.name,
          domain: collab.site.domain,
          created_at: collab.site.created_at,
          role: collab.role as Site['role']
        }))
      ];

      // Sort by created_at desc
      allSites.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setSites(allSites);

      // If user has no sites, redirect to setup page
      if (allSites.length === 0) {
        // Avoid redirect loop
        if (!pathname.startsWith('/setup')) {
          router.push('/setup');
        }
        setCurrentSite(null);
        return;
      }

      // If currentSite was deleted, reset to first available
      if (currentSite && !allSites.find(s => s.id === currentSite.id)) {
        if (allSites.length > 0) {
          setCurrentSite(allSites[0]);
          localStorage.setItem('selectedSiteId', allSites[0].id);
        } else {
          setCurrentSite(null);
          localStorage.removeItem('selectedSiteId');
        }
      }

      // Set current site from localStorage or default to first site
      const savedSiteId = localStorage.getItem('selectedSiteId');
      if (savedSiteId) {
        const savedSite = allSites.find(s => s.id === savedSiteId);
        if (savedSite) {
          setCurrentSite(savedSite);
          return;
        }
      }

      // Default to first site
      if (allSites.length > 0 && !currentSite) {
        setCurrentSite(allSites[0]);
        localStorage.setItem('selectedSiteId', allSites[0].id);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleSetCurrentSite = async (site: Site) => {
    setCurrentSite(site);
    localStorage.setItem('selectedSiteId', site.id);
    
    // If we're in admin and switching sites, navigate to first collection or show empty state
    if (pathname.startsWith('/admin')) {
      try {
        const response = await fetch(`/api/admin/collections?siteId=${site.id}`);
        if (response.ok) {
          const data = await response.json();
          const collections = data.collections || [];
          
          if (collections.length > 0) {
            // Navigate to first collection
            router.push(`/admin/collections/${collections[0].slug}`);
          } else {
            // Navigate to a special empty state route that will show the empty state
            router.push('/admin/collections/empty');
          }
        }
      } catch (error) {
        console.error('Error fetching collections for navigation:', error);
      }
    }
  };

  const refreshSites = async () => {
    await fetchSites();
  };

  return (
    <SiteContext.Provider
      value={{
        currentSite,
        sites,
        isLoading,
        setCurrentSite: handleSetCurrentSite,
        refreshSites
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
} 