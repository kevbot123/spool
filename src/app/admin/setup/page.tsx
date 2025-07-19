'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldSetupRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new setup location
    router.replace('/setup');
  }, [router]);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">Redirecting to setup...</p>
      </div>
    </div>
  );
}