'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSite } from '@/context/SiteContext';

interface SetupGuardProps {
  children: React.ReactNode;
}

export function SetupGuard({ children }: SetupGuardProps) {
  const { sites, isLoading } = useSite();
  const router = useRouter();
  const pathname = usePathname();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    // If user has no sites and is trying to access admin, redirect to setup
    if (sites.length === 0 && pathname.startsWith('/admin')) {
      router.push('/setup');
      return;
    }

    // Allow users to access setup page even if they have sites (for creating additional sites)
    // Only redirect from setup to admin if user navigates directly to setup without intent to create a new site
    // We'll handle this differently - let the setup page itself handle the flow

    setShouldRender(true);
  }, [sites, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!shouldRender) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}