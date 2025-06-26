'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSite } from '@/context/SiteContext';

export default function AdminDashboard() {
  const { currentSite } = useSite();
  const router = useRouter();

  useEffect(() => {
    if (!currentSite) return;

    const redirectToAppropriatePlace = async () => {
      try {
        const response = await fetch(`/api/admin/collections?siteId=${currentSite.id}`);
        if (response.ok) {
          const data = await response.json();
          const collections = data.collections || [];
          
          if (collections.length > 0) {
            // Redirect to first collection
            router.replace(`/admin/collections/${collections[0].slug}`);
          } else {
            // Redirect to empty state
            router.replace('/admin/collections/empty');
          }
        } else {
          // Fallback to empty state if API fails
          router.replace('/admin/collections/empty');
        }
      } catch (error) {
        console.error('Error fetching collections for redirect:', error);
        router.replace('/admin/collections/empty');
      }
    };

    redirectToAppropriatePlace();
  }, [currentSite, router]);

  // Show loading state while redirecting
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">Loading admin...</p>
      </div>
    </div>
  );
} 