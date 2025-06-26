'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface AdminHeaderContextType {
  headerContent: ReactNode | null;
  setHeaderContent: (content: ReactNode | null) => void;
  breadcrumbs: { label: string; href?: string }[];
  setBreadcrumbs: (breadcrumbs: { label: string; href?: string }[]) => void;
}

const AdminHeaderContext = createContext<AdminHeaderContextType | undefined>(undefined);

export function AdminHeaderProvider({ children }: { children: ReactNode }) {
  const [headerContent, setHeaderContent] = useState<ReactNode | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; href?: string }[]>([]);

  const value = useMemo(() => ({
    headerContent, 
    setHeaderContent, 
    breadcrumbs, 
    setBreadcrumbs 
  }), [headerContent, breadcrumbs]);

  return (
    <AdminHeaderContext.Provider value={value}>
      {children}
    </AdminHeaderContext.Provider>
  );
}

export function useAdminHeader() {
  const context = useContext(AdminHeaderContext);
  if (context === undefined) {
    throw new Error('useAdminHeader must be used within an AdminHeaderProvider');
  }
  return context;
} 