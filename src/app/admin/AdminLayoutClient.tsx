'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map } from 'lucide-react';
import { CollectionConfig } from '@/types/cms';

interface AdminLayoutClientProps {
  children: ReactNode;
  collections: CollectionConfig[];
}

export default function AdminLayoutClient({
  children,
  collections
}: AdminLayoutClientProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen compact-ui">
        {/* Sidebar */}
        <aside className="w-48 bg-white border-r border-gray-200">
          <nav className="h-full overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-base font-semibold">Collections</h1>
                <Link
                  href="/admin"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Home size={16} />
                </Link>
              </div>
              {/* <h2 className="text-[11px] font-semibold text-muted-foreground tracking-wider mb-3">
                Collections
              </h2> */}
              <ul className="space-y-1">
                {collections.map((collection: CollectionConfig) => (
                  <li key={collection.slug}>
                    <Link
                      href={`/admin/collections/${collection.slug}`}
                      className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${pathname === `/admin/collections/${collection.slug}` ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                    >
                      {collection.name}
                    </Link>
                  </li>
                ))}
              </ul>
              
              {/* Sitemap Link */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Link
                  href="/sitemap.xml"
                  target="_blank"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                >
                  <Map size={14} />
                  View Sitemap
                </Link>
              </div>
            </div>
            
            {/* <div className="p-4 border-t border-gray-200">
              <h2 className="text-[11px] font-semibold text-muted-foreground tracking-wider mb-3">
                System
              </h2>
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/admin/media"
                    className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${pathname === '/admin/media' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                  >
                    Media Library
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/settings"
                    className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${pathname === '/admin/settings' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                  >
                    Settings
                  </Link>
                </li>
              </ul>
            </div> */}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-y-hidden">
          {children}
        </main>
      </div>
    </div>
  );
} 