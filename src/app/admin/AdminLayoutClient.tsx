'use client';

import { ReactNode } from 'react';
import { AppSidebar } from '@/components/admin/AppSidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { AdminHeaderProvider, useAdminHeader } from '@/context/AdminHeaderContext';
import Link from 'next/link';

interface AdminLayoutClientProps {
  children: ReactNode;
}

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const { headerContent, breadcrumbs } = useAdminHeader();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white min-w-0">
          <div className="flex flex-1 items-center gap-2 px-4 min-w-0">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((breadcrumb, index) => (
                  <BreadcrumbItem key={index}>
                    {breadcrumb.href && index < breadcrumbs.length - 1 ? (
                      <BreadcrumbLink asChild>
                        <Link href={breadcrumb.href} className="line-clamp-1">
                          {breadcrumb.label}
                        </Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="line-clamp-1">
                        {breadcrumb.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          {headerContent && (
            <div className="flex items-center gap-2 px-4 shrink-0">
              {headerContent}
            </div>
          )}
        </header>
        <div className="flex flex-1 flex-col min-w-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AdminLayoutClient({
  children
}: AdminLayoutClientProps) {
  return (
    <AdminHeaderProvider>
      <AdminLayoutContent>
        {children}
      </AdminLayoutContent>
    </AdminHeaderProvider>
  );
} 