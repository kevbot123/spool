'use client';

import { useState, useEffect } from 'react';
import CollectionSetupModal from '@/components/admin/CollectionSetupModal';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionConfig | null>(null);
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
    setEditingCollection(null);
    setIsModalOpen(true);
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
    <>
      <SidebarGroup>
      <SidebarGroupLabel>Collections</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {collections.map((collection) => (
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
                  <DropdownMenuItem onClick={() => { setEditingCollection(collection); setIsModalOpen(true); }}>
                    <span>Edit Collection</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleCreateCollection} className="text-primary">
              <Plus />
              <span>New Collection</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
      </SidebarGroup>
      {isModalOpen && (
    <CollectionSetupModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      existingCollection={editingCollection || undefined}
      onSave={async (data) => {
        if (!currentSite) return;
        try {
          const method = editingCollection ? 'PUT' : 'POST';
          const url = editingCollection
            ? `/api/admin/collections/${editingCollection.slug}?siteId=${currentSite.id}`
            : `/api/admin/collections?siteId=${currentSite.id}`;
          const resp = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, siteId: currentSite.id }),
          });
          if (!resp.ok) throw new Error('Failed to save');
          await loadCollections();
          setIsModalOpen(false);
        } catch (error) {
          console.error('Save collection error', error);
        }
      }}
    />
  )}
    </>
  );
} 