'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContentItem, CollectionConfig } from '@/types/cms';
import { CollectionTable } from '@/components/admin/CollectionTable';

interface AdminContentProviderProps {
  collection: CollectionConfig;
  initialItems: ContentItem[];
  authToken: string | null;
}

export function AdminContentProvider({ collection, initialItems, authToken }: AdminContentProviderProps) {
  const [items, setItems] = useState(initialItems);
  const router = useRouter();

  const handleBatchUpdate = async (updatedItems: ContentItem[]) => {
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

      // Update the local state with the returned items
      setItems(prevItems => {
        const newItems = [...prevItems];
        for (const updatedItem of results) {
          const index = newItems.findIndex(item => item.id === updatedItem.id);
          if (index !== -1) {
            newItems[index] = updatedItem;
          }
        }
        return newItems;
      });

      router.refresh();
      return results;
    } catch (error) {
      console.error('Error batch updating content:', error);
      alert('Failed to update one or more items. Please try again.');
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    try {
      const response = await fetch(`/api/admin/content/${collection.slug}/${item.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete content');
      }

      setItems(items.filter(i => i.id !== id));
      
      // Refresh the page data
      router.refresh();
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Failed to delete content. Please try again.');
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch(`/api/admin/content/${collection.slug}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create content');
      }

      const newItem = await response.json();
      setItems([newItem, ...items]);
      router.refresh();
    } catch (error) {
      console.error('Error creating content:', error);
      alert('Failed to create content. Please try again.');
    }
  };

  return (
    <CollectionTable
      collection={collection}
      items={items}
      onBatchUpdate={handleBatchUpdate}
      onDelete={handleDelete}
      onCreate={handleCreate}
      authToken={authToken}
    />
  );
} 