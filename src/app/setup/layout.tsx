import { ReactNode } from 'react';
import { Metadata } from 'next';
import { SiteProvider } from '@/context/SiteContext';
import { SetupGuard } from '@/components/SetupGuard';

export const metadata: Metadata = {
  title: 'Setup - Spool CMS',
  description: 'Set up your first site with Spool CMS',
  robots: 'noindex, nofollow'
};

export default function SetupLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <SiteProvider>
      <SetupGuard>
        <div className="min-h-screen bg-white">
          {children}
        </div>
      </SetupGuard>
    </SiteProvider>
  );
}