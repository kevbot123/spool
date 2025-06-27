'use client';

import { useState, useEffect } from 'react';
import { Search, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CollectionConfig } from '@/types/cms';
import { useAdminHeader } from '@/context/AdminHeaderContext';
import CollectionSetupModal from '@/components/admin/CollectionSetupModal';
import { useSite } from '@/context/SiteContext';

interface BulkActionsDropdownProps {
  onPublishAll: () => void;
  onUnpublishAll: () => void;
  onEditCollection: () => void;
  collection: CollectionConfig;
}

function BulkActionsDropdown({ onPublishAll, onUnpublishAll, onEditCollection, collection }: BulkActionsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open bulk actions menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onPublishAll}>
          Publish All Items
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onUnpublishAll}>
          Unpublish All Items
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEditCollection}>
          Edit Collection
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface CollectionHeaderProps {
  collection: CollectionConfig;
  itemCount: number;
  pendingChangesCount: number;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  onSaveAll?: () => void;
  onCreate: () => void;
  onPublishAll?: () => void;
  onUnpublishAll?: () => void;
}


export function CollectionHeader({
  collection,
  itemCount,
  pendingChangesCount,
  globalFilter,
  onGlobalFilterChange,
  onSaveAll,
  onCreate,
  onPublishAll,
  onUnpublishAll
}: CollectionHeaderProps) {
  const { setHeaderContent, setBreadcrumbs } = useAdminHeader();
  const { currentSite } = useSite();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Set breadcrumbs
    setBreadcrumbs([
      { label: collection.name }
    ]);

    // Set header content
    const headerContent = (
      <div className="flex items-center gap-4 min-w-0">
        {/* Collection info */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs whitespace-nowrap">
            {itemCount} items
          </Badge>
          {pendingChangesCount > 0 && (
            <Badge variant="secondary" className="text-xs whitespace-nowrap bg-red-100 text-red-700">
              {pendingChangesCount} unsaved
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => onGlobalFilterChange(e.target.value)}
              className="pl-9 w-40 md:w-48"
            />
          </div>

          {/* Save All Button */}
          {pendingChangesCount > 0 && onSaveAll && (
            <Button onClick={onSaveAll} variant="default" size="sm" className="bg-green-600 hover:bg-green-700 whitespace-nowrap">
              Save All ({pendingChangesCount})
            </Button>
          )}

          {/* Create Button */}
          <Button onClick={onCreate} size="sm" className="whitespace-nowrap">
            Add new
          </Button>

          {/* Bulk Actions */}
          {itemCount > 0 && onPublishAll && onUnpublishAll && (
            <BulkActionsDropdown
              onPublishAll={onPublishAll}
              onUnpublishAll={onUnpublishAll}
              onEditCollection={() => setIsModalOpen(true)}
              collection={collection}
            />
          )}
        </div>
      </div>
    );

    setHeaderContent(headerContent);

    // Cleanup
    return () => {
      setHeaderContent(null);
      setBreadcrumbs([]);
    };
  }, [
    collection,
    itemCount,
    pendingChangesCount,
    globalFilter,
    onGlobalFilterChange,
    onSaveAll,
    onCreate,
    onPublishAll,
    onUnpublishAll
  ]);

  return (
    <>
      {isModalOpen && (
        <CollectionSetupModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          existingCollection={collection}
          onSave={async (data: Partial<CollectionConfig>) => {
            if (!currentSite) return;
            try {
              const resp = await fetch(`/api/admin/collections/${collection.slug}?siteId=${currentSite.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });
              if (resp.ok) {
                setIsModalOpen(false);
                // Optionally reload page or trigger refetch
              } else {
                console.error('Failed to save collection');
              }
            } catch(err) {
              console.error('Save collection error', err);
            }
          }}
        />
      )}
    </>
  );
} 