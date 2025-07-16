'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImportNewCollectionModal } from '@/components/admin/ImportNewCollectionModal';

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
import CollectionActionsDropdown from '@/components/admin/CollectionActionsDropdown';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSite } from '@/context/SiteContext';
import { CollectionConfig } from '@/types/cms';

export function NavFavorites() {
  const pathname = usePathname();
  const { currentSite } = useSite();
  const [collections, setCollections] = useState<CollectionConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
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
    setChoiceOpen(true);
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
              <CollectionActionsDropdown
                collection={collection}
                align="start"
                trigger={
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                }
                onPublishAll={() => alert('Publish All clicked')}
                onUnpublishAll={() => alert('Unpublish All clicked')}
                onImportItems={() => alert('Import Items clicked')}
                onEditCollection={() => {
                  setEditingCollection(collection);
                  setIsModalOpen(true);
                }}
                onDeleted={async () => {
                  await loadCollections();
                  if (pathname.startsWith(`/admin/collections/${collection.slug}`)) {
                    window.location.href = '/admin';
                  }
                }}
              />
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
      {/* Scratch setup modal */}
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

      {/* Import CSV flow */}
      {importModalOpen && (
        <ImportNewCollectionModal
          open={importModalOpen}
          onOpenChange={(v)=>setImportModalOpen(v)}
          onCreated={async ()=>{
            await loadCollections();
            setImportModalOpen(false);
          }}
        />
      )}

      {/* Choice dialog */}
      {choiceOpen && (
        <Dialog open={choiceOpen} onOpenChange={setChoiceOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="sr-only">Create collection</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4">
              <button
                className="border rounded-lg p-6 flex flex-col items-center gap-2 hover:bg-muted"
                onClick={()=>{
                  setChoiceOpen(false);
                  setIsModalOpen(true);
                }}
              >
                <span className="font-medium text-lg">Start from scratch</span>
              </button>
              <button
                className="border rounded-lg p-6 flex flex-col items-center gap-2 hover:bg-muted"
                onClick={()=>{
                  setChoiceOpen(false);
                  setImportModalOpen(true);
                }}
              >
                <span className="font-medium text-lg">Import from CSV</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 