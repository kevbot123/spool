'use client';

import { useState, useEffect } from 'react';
import { Folder, Plus, MoreHorizontal } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSite } from '@/context/SiteContext';
import { CollectionConfig } from '@/types/cms';

export function NavFavorites() {
  const pathname = usePathname();
  const { currentSite } = useSite();
  const [collections, setCollections] = useState<CollectionConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentSite) {
      loadCollections();
    } else {
      setCollections([]);
    }
  }, [currentSite?.id]);

  const loadCollections = async () => {
    if (!currentSite) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/collections?siteId=${currentSite.id}`);
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections || []);
      }
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCollection = () => {
    // Trigger collection creation modal
    window.dispatchEvent(new Event('openCollectionModal'));
  };

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Collections</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {Array.from({ length: 3 }).map((_, i) => (
              <SidebarMenuItem key={i}>
                <SidebarMenuButton>
                  <div className="w-4 h-4 bg-sidebar-accent rounded animate-pulse" />
                  <div className="h-4 bg-sidebar-accent rounded animate-pulse flex-1" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Collections</SidebarGroupLabel>
      <SidebarGroupAction onClick={handleCreateCollection}>
        <Plus />
        <span className="sr-only">Add Collection</span>
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu>
          {collections.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleCreateCollection}>
                <Plus />
                <span>Create Collection</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            collections.map((collection) => (
              <SidebarMenuItem key={collection.slug}>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === `/admin/collections/${collection.slug}`}
                >
                  <Link href={`/admin/collections/${collection.slug}`}>
                    <Folder />
                    <span>{collection.name}</span>
                  </Link>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover>
                      <MoreHorizontal />
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48 rounded-lg"
                    side="right"
                    align="start"
                  >
                    <DropdownMenuItem>
                      <span>Edit Collection</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <span>Collection Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <span>View Content</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
} 