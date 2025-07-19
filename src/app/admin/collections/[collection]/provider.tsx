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
  siteId?: string;
}

export function AdminContentProvider({ collection, initialItems, authToken, siteId }: AdminContentProviderProps) {
  const router = useRouter();

  // Move useCollectionData here to be the single source of truth
  const collectionDataHook = useCollectionData({
    collection,
    initialItems,
    authToken,
    onBatchUpdate: handleBatchUpdate,
    onDelete: handleDelete,
  });

  // Function to refresh data from server
  const refreshData = async () => {
    if (!siteId) return;
    
    try {
      const response = await fetch(`/api/admin/content/${collection.slug}?siteId=${siteId}`);
      if (response.ok) {
        const contentData = await response.json();
        // Update the collection data hook with fresh data
        collectionDataHook.setItems(contentData.items || []);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

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
          draft,

          // System fields to include in the payload
          title,
          slug,
          body,
          seoTitle,
          seoDescription,
          ogImage,
          publishedAt,
          status,
          
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
          status,
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

      await refreshData();
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

      // Refresh the data
      await refreshData();
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Failed to delete content. Please try again.');
    }
  }

  const handleCreate = async () => {
    try {
      const url = siteId 
        ? `/api/admin/content/${collection.slug}?siteId=${siteId}`
        : `/api/admin/content/${collection.slug}`;
      
      const response = await fetch(url, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || errorData.details || 'Failed to create content';
        console.error('Server error:', errorData);
        throw new Error(errorMessage);
      }

      const newItem = await response.json();
      await refreshData();
    } catch (error) {
      console.error('Error creating content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create content. Please try again.';
      alert(`Failed to create content: ${errorMessage}`);
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
      // Pass the refresh function for imports
      onImported={refreshData}
    />
  );
} 