"use client";

import React from 'react';
import { MoreVertical, Edit, Trash2, Upload, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog';
import { CollectionConfig } from '@/types/cms';
import { useSite } from '@/context/SiteContext';

interface CollectionActionsDropdownProps {
  collection: CollectionConfig;
  /**
   * Custom trigger element that will be wrapped with `DropdownMenuTrigger asChild`.
   * If omitted, a default small ghost `Button` with a vertical ellipsis icon will be rendered.
   */
  trigger?: React.ReactNode;
  align?: 'start' | 'end' | 'center';

  // Optional callbacks – if a callback is omitted, the corresponding option is hidden.
  onPublishAll?: () => void;
  onUnpublishAll?: () => void;
  onImportItems?: () => void;
  onEditCollection?: () => void;
  /**
   * Called after the collection has been successfully deleted. Handy for refreshing lists or routing.
   */
  onDeleted?: () => void;
}

export default function CollectionActionsDropdown({
  collection,
  trigger,
  align = 'end',
  onPublishAll,
  onUnpublishAll,
  onImportItems,
  onEditCollection,
  onDeleted,
}: CollectionActionsDropdownProps) {
  const { currentSite } = useSite();

  const deleteCollection = async () => {
    if (!currentSite) return;

    try {
      const resp = await fetch(
        `/api/admin/collections/${collection.slug}?siteId=${currentSite.id}`,
        {
          method: 'DELETE',
        },
      );
      if (!resp.ok) throw new Error('Failed to delete collection');
      if (onDeleted) onDeleted();
      else window.location.href = '/admin';
    } catch (err) {
      /* eslint-disable no-console */
      console.error('Error deleting collection', err);
      alert('Failed to delete collection');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="h-8 w-7 p-0">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Collection actions</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {onPublishAll && (
          <DropdownMenuItem onClick={onPublishAll}>
            <CheckCircle className="mr-2 h-4 w-4" />
            <span>Publish All Items</span>
          </DropdownMenuItem>
        )}
        {onUnpublishAll && (
          <DropdownMenuItem onClick={onUnpublishAll}>
            <XCircle className="mr-2 h-4 w-4" />
            <span>Unpublish All Items</span>
          </DropdownMenuItem>
        )}
        {onImportItems && (
          <DropdownMenuItem onClick={onImportItems}>
            <Upload className="mr-2 h-4 w-4" />
            <span>Import items</span>
          </DropdownMenuItem>
        )}
        {onEditCollection && (
          <DropdownMenuItem onClick={onEditCollection}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Edit Collection</span>
          </DropdownMenuItem>
        )}
        {onDeleted && (
          <DestructiveActionDialog
            trigger={
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="text-red-600 focus:text-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Collection</span>
              </DropdownMenuItem>
            }
            title={`Delete collection "${collection.name}"?`}
            description="This will permanently delete the collection and all of its content. This action cannot be undone. Type the phrase 'delete forever' to confirm."
            confirmInputText="delete forever"
            onConfirm={deleteCollection}
          />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
