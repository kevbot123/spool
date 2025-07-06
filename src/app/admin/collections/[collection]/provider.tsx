'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContentItem, CollectionConfig } from '@/types/cms';
import { CollectionTable } from '@/components/admin/CollectionTable';
import { useCollectionData } from '@/hooks/useCollectionData';

interface AdminContentProviderProps {
  collection: CollectionConfig;
  initialItems: ContentItem[];
  authToken: string | null;
}

export function AdminContentProvider({ collection, initialItems, authToken }: AdminContentProviderProps) {
  const router = useRouter();

  // Move useCollectionData here to be the single source of truth
  const collectionDataHook = useCollectionData({
    collection,
    initialItems,
    authToken,
    onBatchUpdate: handleBatchUpdate,
    onDelete: handleDelete,
  });

  async function handleBatchUpdate(updatedItems: ContentItem[]) {
    try {
      const results = await Promise.all(updatedItems.map(item => {
        
        // Correctly separate system fields from custom data fields
        const {
          // System fields that are not part of the update payload
          id,
          collection: itemCollection,
          createdAt,
          updatedAt,
          status,
          draft,

          // System fields to include in the payload
          title,
          slug,
          body,
          seoTitle,
          seoDescription,
          ogImage,
          publishedAt,
          
          // The rest is the 'data' object with custom fields
          data,
        } = item;

        const updatePayload: any = {
          title,
          slug,
          body,
          seoTitle,
          seoDescription,
          ogImage,
          publishedAt,
          data,
        };
        
        console.log(`🚀 Sending payload for ${item.id}:`, updatePayload);
        
        return fetch(`/api/admin/content/${itemCollection}/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        }).then(res => {
          if (!res.ok) {
            throw new Error(`Failed to update item ${item.id}`);
          }
          return res.json();
        });
      }));

      router.refresh();
      return results;
    } catch (error) {
      console.error('Error batch updating content:', error);
      alert('Failed to update one or more items. Please try again.');
      throw error;
    }
  }

  async function handleDelete(id: string) {
    const item = collectionDataHook.items.find(i => i.id === id);
    if (!item) return;

    try {
      const response = await fetch(`/api/admin/content/${collection.slug}/${item.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete content');
      }

      // Refresh the page data
      router.refresh();
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Failed to delete content. Please try again.');
    }
  }

  const handleCreate = async () => {
    try {
      const response = await fetch(`/api/admin/content/${collection.slug}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create content');
      }

      const newItem = await response.json();
      router.refresh();
    } catch (error) {
      console.error('Error creating content:', error);
      alert('Failed to create content. Please try again.');
    }
  };

  return (
    <CollectionTable
      collection={collection}
      items={collectionDataHook.items}
      onBatchUpdate={collectionDataHook.batchUpdate}
      onDelete={collectionDataHook.deleteItem}
      onCreate={handleCreate}
      authToken={authToken}
      // Pass all the hook data and handlers
      collectionDataHook={collectionDataHook}
    />
  );
} 