import { ReactNode } from 'react';
import { getCollectionsManager } from '@/lib/cms/collections';
import { Metadata } from 'next';
import AdminLayoutClient from './AdminLayoutClient';

export const metadata: Metadata = {
  title: 'CMS Admin',
  description: 'Content Management System Admin Panel',
  robots: 'noindex, nofollow'
};

export default async function AdminLayout({
  children
}: {
  children: ReactNode;
}) {
  const collectionsManager = await getCollectionsManager();
  const collections = collectionsManager.getAllCollections();

  return (
    <AdminLayoutClient collections={collections}>
      {children}
    </AdminLayoutClient>
  );
}