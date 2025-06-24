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
        // Exclude properties from the 'data' object that are already top-level
        const { 
          slug: _slug, 
          title: _title, 
          body: _body, 
          id: _id,
          ...restOfData 
        } = item.data || {};
        
        const updatePayload: any = {
          ...restOfData,
          title: item.title,
          slug: item.slug,
          body: item.body,
          seoTitle: item.seoTitle,
          seoDescription: item.seoDescription,
          ogImage: item.ogImage,
          featured: item.data?.featured,
          publishedAt: item.publishedAt, // This will be undefined for unpublished items
        };
        
        console.log(`🚀 Sending payload for ${item.id}:`, updatePayload);
        
        return fetch(`/api/admin/content/${collection.slug}/${item.id}`, {
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