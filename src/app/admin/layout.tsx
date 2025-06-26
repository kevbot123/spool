import { ReactNode } from 'react';
import { Metadata } from 'next';
import AdminLayoutClient from './AdminLayoutClient';
import { SiteProvider } from '@/context/SiteContext';

export const metadata: Metadata = {
  title: 'CMS Admin',
  description: 'Content Management System Admin Panel',
  robots: 'noindex, nofollow'
};

export default function AdminLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <SiteProvider>
      <AdminLayoutClient>
        {children}
      </AdminLayoutClient>
    </SiteProvider>
  );
}