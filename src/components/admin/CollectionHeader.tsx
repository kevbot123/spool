'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MoreHorizontal, Plus, MoreVertical } from 'lucide-react';
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
        <Button variant="ghost" size="sm" className="h-8 w-7 p-0">
          <MoreVertical className="h-4 w-4" />
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
  const router = useRouter();

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
          {/* <Badge variant="secondary" className="text-xs whitespace-nowrap">
            {itemCount} items
          </Badge> */}
          {pendingChangesCount > 0 && (
            <Badge variant="secondary" className="text-xs font-medium whitespace-nowrap bg-blue-50 text-blue-700">
              {pendingChangesCount} pending edit{pendingChangesCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Save All Button */}
          {pendingChangesCount > 0 && onSaveAll && (
            <Button onClick={onSaveAll} size="sm" className="whitespace-nowrap">
              Republish all ({pendingChangesCount})
            </Button>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => onGlobalFilterChange(e.target.value)}
              className="pl-8 w-40 md:w-48 max-h-[32px]"
            />
          </div>

          {/* Create Button */}
          <Button onClick={onCreate} size="sm" className="whitespace-nowrap" variant="outline">
            <Plus className="w-4 h-4" />
            New
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
                router.refresh();
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