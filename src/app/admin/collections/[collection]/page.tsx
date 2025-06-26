'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { AdminContentProvider } from './provider';
import { useSite } from '@/context/SiteContext';
import { CollectionConfig } from '@/types/cms';

interface PageProps {
  params: Promise<{
    collection: string;
  }>;
}

export default function CollectionPage({ params }: PageProps) {
  const { currentSite } = useSite();
  const router = useRouter();
  const [collectionSlug, setCollectionSlug] = useState<string>('');
  const [collection, setCollection] = useState<CollectionConfig | null>(null);
  const [initialItems, setInitialItems] = useState<any[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allCollections, setAllCollections] = useState<CollectionConfig[]>([]);

  // Get collection slug from params
  useEffect(() => {
    params.then(({ collection }) => {
      setCollectionSlug(collection);
    });
  }, [params]);

  // Load collection and content when site or collection changes
  useEffect(() => {
    if (!currentSite || !collectionSlug) return;

    console.log('Loading collection data for:', collectionSlug, 'on site:', currentSite.name);
    
    const loadCollectionData = async () => {
      setIsLoading(true);
      try {
        // Get auth token
        const { createBrowserClient } = await import('@supabase/ssr');
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { session } } = await supabase.auth.getSession();
        
        setAuthToken(session?.access_token || null);

        // Get collection config
        const collectionsResponse = await fetch(`/api/admin/collections?siteId=${currentSite.id}`);
        if (!collectionsResponse.ok) {
          throw new Error('Failed to load collections');
        }
        
        const collectionsData = await collectionsResponse.json();
        const collections = collectionsData.collections || [];
        setAllCollections(collections);
        
        const foundCollection = collections.find((c: any) => c.slug === collectionSlug);
        
        if (!foundCollection) {
          // Collection doesn't exist for this site - redirect to first available collection
          if (collections.length > 0) {
            router.replace(`/admin/collections/${collections[0].slug}`);
            return;
          }
          // If no collections, we'll show the empty state below
        }
        
        setCollection(foundCollection);

        // Get content for this collection
        const contentResponse = await fetch(`/api/admin/content/${collectionSlug}?siteId=${currentSite.id}`);
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          setInitialItems(contentData.items || []);
        } else {
          setInitialItems([]);
        }
      } catch (error) {
        console.error('Error loading collection data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCollectionData();
  }, [currentSite?.id, collectionSlug]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading collection...</p>
        </div>
      </div>
    );
  }

  // Empty state is now handled by /admin/collections/empty route

  if (!collection) {
    // Loading state or redirecting
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <AdminContentProvider
        collection={collection}
        initialItems={initialItems}
        authToken={authToken}
      />
    </div>
  );
}