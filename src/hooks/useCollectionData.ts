import { useState, useEffect, useCallback, useMemo } from 'react';
import { ContentItem, CollectionConfig } from '@/types/cms';
import { debounce } from 'lodash';
import { toast } from 'sonner';

interface PendingChange {
  itemId: string;
  changes: Partial<ContentItem>;
}

interface UseCollectionDataOptions {
  collection: CollectionConfig;
  initialItems: ContentItem[];
  authToken: string | null;
  onBatchUpdate?: (items: ContentItem[]) => Promise<ContentItem[]>;

}

export function useCollectionData({
  collection,
  initialItems,
  authToken,
  onBatchUpdate,

}: UseCollectionDataOptions) {
  const [rawItems, setRawItems] = useState<ContentItem[]>(initialItems);
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());

  // Memoized items with draft data merged for display
  const items = useMemo(() => {
    return rawItems.map(item => {
      // Only merge draft data for published items
      if (item.publishedAt && item.draft && Object.keys(item.draft).length > 0) {
        // Create a stable merged object
        const mergedItem = {
          ...item,
          ...item.draft,
          data: {
            ...(item.data || {}),
            ...((item.draft as any).data || {}),
          },
        };
        return mergedItem;
      }
      // Return the original item reference if no changes needed
      return item;
    });
  }, [rawItems]);

  // Debounced save functions
  const debouncedSaveDraft = useMemo(
    () => debounce(async (itemId: string, changes: Partial<ContentItem>) => {
      try {
        await fetch(`/api/admin/content/${collection.slug}/${itemId}/draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        });
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }, 1000),
    [collection.slug]
  );

  const debouncedSaveItem = useMemo(
    () => debounce(async (itemId: string, changes: Partial<ContentItem>) => {
      try {
        const response = await fetch(`/api/admin/content/${collection.slug}/${itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        });

        if (!response.ok) {
          throw new Error('Failed to save changes');
        }
        
        const updatedItem = await response.json();
        
        setRawItems(prev => prev.map(i => 
          i.id === itemId ? { ...i, ...updatedItem } : i
        ));
        
        setPendingChanges(prev => {
          const newMap = new Map(prev);
          newMap.delete(itemId);
          return newMap;
        });
      } catch (error) {
        console.error('Failed to save item:', error);
        toast.error('Failed to save changes.');
      }
    }, 1000),
    [collection.slug]
  );

  // Initialize pending changes from draft data
  useEffect(() => {
    const initialPendingChanges = new Map<string, PendingChange>();
    
    initialItems.forEach(item => {
      if (!item.publishedAt || !item.draft || Object.keys(item.draft).length === 0) return;

      const draft = item.draft as any;
      const changes: any = {};

      // Check top-level fields in draft
      Object.keys(draft).forEach(key => {
        if (key === 'data') return;
        if ((item as any)[key] !== draft[key]) {
          changes[key] = draft[key];
        }
      });

      // Check data-level fields
      if (draft.data && typeof draft.data === 'object') {
        const dataChanges: any = {};
        Object.keys(draft.data).forEach(dataKey => {
          if (item.data?.[dataKey] !== draft.data[dataKey]) {
            dataChanges[dataKey] = draft.data[dataKey];
          }
        });
        if (Object.keys(dataChanges).length > 0) {
          changes.data = dataChanges;
        }
      }

      if (Object.keys(changes).length > 0) {
        initialPendingChanges.set(item.id, { itemId: item.id, changes });
      }
    });

    if (initialPendingChanges.size > 0) {
      setPendingChanges(initialPendingChanges);
    }
  }, [initialItems]);

  // Sync raw items when initial items change
  useEffect(() => {
    setRawItems(initialItems);
  }, [initialItems]);

  // Auto-save pending changes
  useEffect(() => {
    pendingChanges.forEach((change, itemId) => {
      const item = rawItems.find(i => i.id === itemId);
      if (item) {
        if (item.publishedAt) {
          debouncedSaveDraft(itemId, change.changes);
        } else {
          debouncedSaveItem(itemId, change.changes);
        }
      }
    });
  }, [pendingChanges, debouncedSaveDraft, debouncedSaveItem, rawItems]);

  // Update field handler
  const updateField = useCallback((itemId: string, fieldName: string, value: any) => {
    const item = rawItems.find(i => i.id === itemId);
    if (!item) return;

    const isSystemField = ['title', 'slug', 'seoTitle', 'seoDescription', 'ogImage', 'status'].includes(fieldName);
    const isPublished = (item as any).status === 'published';

    // Get the current value to check if it actually changed
    let currentValue;
    if (fieldName === 'status') {
      const explicitStatus = (item as any).status || item.data?.status;
      currentValue = explicitStatus || 'draft';
    } else {
      currentValue = isSystemField ? (item as any)[fieldName] : item.data?.[fieldName];
    }
    
    // Don't do anything if the value hasn't actually changed
    if (currentValue === value) {
      return;
    }

    // Special handling for unpublishing
    if (isPublished && fieldName === 'status' && value !== 'published') {
      handleUnpublish(itemId);
      return;
    }

    // Update local state immediately
    setRawItems(prev => prev.map(i => {
      if (i.id !== itemId) return i;

      let updatedItem = { ...i };

      // Update the main item data
      if (isSystemField) {
        if (fieldName === 'status') {
          const newPublishedAt = value === 'published' ? (i.publishedAt || new Date().toISOString()) : null;
          updatedItem = { ...updatedItem, status: value, publishedAt: newPublishedAt };
        } else {
          updatedItem = { ...updatedItem, [fieldName]: value };
        }
      } else {
        updatedItem.data = { ...(i.data || {}), [fieldName]: value };
      }

      // If published, also update draft
      if (isPublished) {
        let draftChanges: any = {};
        if (isSystemField) {
          draftChanges = { [fieldName]: value };
          if (fieldName === 'status') {
            draftChanges.publishedAt = value === 'published' ? (i.publishedAt || new Date().toISOString()) : null;
          }
        } else {
          draftChanges.data = { [fieldName]: value };
        }

        updatedItem.draft = {
          ...(updatedItem.draft || {}),
          ...draftChanges,
          data: {
            ...((updatedItem.draft as any)?.data || {}),
            ...(draftChanges.data || {}),
          }
        };
      }

      return updatedItem;
    }));

    // Update pending changes
    if (isPublished) {
      setPendingChanges(prev => {
        const newChanges = new Map(prev);
        const existing = newChanges.get(itemId) || { itemId, changes: {} };
        
        let updatedChanges;
        if (isSystemField) {
          updatedChanges = { ...existing.changes, [fieldName]: value };
          if (fieldName === 'status') {
            updatedChanges.publishedAt = value === 'published' ? (item.publishedAt || new Date().toISOString()) : null;
          }
        } else {
          updatedChanges = { 
            ...existing.changes, 
            data: { 
              ...((existing.changes as any).data || {}), 
              [fieldName]: value 
            } 
          };
        }
        
        newChanges.set(itemId, { itemId, changes: updatedChanges });
        return newChanges;
      });
    } else {
      // Draft items should autosave immediately without creating pending changes.

      // Prepare the change payload based on system vs. data field
      const changePayload = isSystemField
        ? { [fieldName]: value }
        : { data: { [fieldName]: value } };

      // Debounced PUT directly to the live (draft) record
      debouncedSaveItem(itemId, changePayload);
      // Note: we intentionally do NOT record pendingChanges for draft items so that
      // the UI doesn’t show the republish / clear-changes workflow.
    }
  }, [rawItems]);

  // Handle unpublishing with pending changes cleanup
  const handleUnpublish = useCallback(async (itemId: string) => {
    const item = rawItems.find(i => i.id === itemId);
    if (!item) return;

    // Clear pending changes
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });

    // Find the original state from initial items
    const originalItem = initialItems.find(i => i.id === itemId) || item;

    // Optimistically update to original state but as draft
    setRawItems(prev => prev.map(i => {
      if (i.id !== itemId) return i;

      // Remove any stored datePublished in custom data
      const cleanedData = { ...(originalItem.data || {}) } as any;
      delete cleanedData.datePublished;
      delete cleanedData.publishedAt;

      return {
        ...originalItem,
        status: 'draft',
        publishedAt: null,
        draft: null,
        data: cleanedData,
      };
    }));

    // Update server in background
    try {
      setSavingItems(prev => new Set(prev).add(itemId));
      
      // Delete draft and unpublish
      await fetch(`/api/admin/content/${collection.slug}/${itemId}/draft`, { method: 'DELETE' });
      
      const response = await fetch(`/api/admin/content/${collection.slug}/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft', publishedAt: null }),
      });
      
      if (!response.ok) throw new Error('Failed to unpublish item');
      
      const updatedItem = await response.json();
      setRawItems(prev => prev.map(i => i.id === itemId ? updatedItem : i));
      
    } catch (error) {
      console.error('Failed to unpublish:', error);
    } finally {
      setSavingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [rawItems, initialItems, collection.slug]);

  // Toggle publish status
  const togglePublish = useCallback(async (itemId: string) => {
    const item = rawItems.find(i => i.id === itemId);
    if (!item) return;

    const newStatus = (item as any).status === 'published' ? 'draft' : 'published';

    if (newStatus === 'draft') {
      await handleUnpublish(itemId);
    } else {
      const newPublishedAt = new Date().toISOString();
      
      try {
        const response = await fetch(`/api/admin/content/${collection.slug}/${itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, publishedAt: newPublishedAt }),
        });

        if (!response.ok) {
          toast.error(`Failed to publish "${item.title}"`);
          throw new Error('Failed to update publish status');
        }

        const updatedItem = await response.json();
        
        setRawItems(prev => prev.map(i => 
          i.id === itemId ? { ...i, status: updatedItem.status, publishedAt: updatedItem.publishedAt } : i
        ));

        toast.success(`Published "${item.title || 'Item'}".`);
      } catch (error) {
        console.error('Failed to toggle publish status:', error);
      }
    }
  }, [handleUnpublish, collection.slug]);

  // Republish item with pending changes
  const republishItem = useCallback(async (itemId: string) => {
    // Ensure any in-flight debounced draft save is sent before republishing
    debouncedSaveDraft.flush();
    
    const change = pendingChanges.get(itemId);
    const item = rawItems.find(i => i.id === itemId);
    if (!item) return;

    const draftPayload = change ? change.changes : null;
    setSavingItems(prev => new Set(prev).add(itemId));

    try {
      const response = await fetch(`/api/admin/content/${collection.slug}/${item.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ draft: draftPayload }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to republish');
      }

      const republishedItem = await response.json();
      
      setRawItems(prev => prev.map(i => {
        if (i.id !== republishedItem.id) return i;

        return {
          ...i,
          ...republishedItem,
          data: {
            ...(i.data || {}),
            ...(republishedItem.data || {}),
          },
        };
      }));
      
      setPendingChanges(prev => {
        const newMap = new Map(prev);
        newMap.delete(itemId);
        return newMap;
      });
      
      toast.success('Changes published successfully');
    } catch (error) {
      console.error('Failed to republish:', error);
      toast.error('Failed to republish changes');
    } finally {
      setSavingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [pendingChanges, collection.slug, authToken, debouncedSaveDraft]);

  // Clear pending changes
  const clearPendingChanges = useCallback(async (itemId: string) => {
    debouncedSaveDraft.cancel();
    
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });

    try {
      setSavingItems(prev => new Set(prev).add(itemId));
      
      await fetch(`/api/admin/content/${collection.slug}/${itemId}/draft`, { method: 'DELETE' });
      
      const res = await fetch(`/api/admin/content/${collection.slug}/${itemId}`);
      if (res.ok) {
        const liveItem = await res.json();
        setRawItems(prev => prev.map(i => i.id === itemId ? liveItem : i));
      }
      
      toast.success('Pending changes cleared');
    } catch (error) {
      console.error('Failed to clear pending changes:', error);
      toast.error('Failed to clear pending changes');
    } finally {
      setSavingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [collection.slug, debouncedSaveDraft]);

  // Batch update handler
  const batchUpdate = useCallback(async (updatedItems: ContentItem[]) => {
    if (!onBatchUpdate) return [];

    const itemIds = updatedItems.map(i => i.id);
    setSavingItems(prev => new Set([...prev, ...itemIds]));

    try {
      const result = await onBatchUpdate(updatedItems);
      
      setRawItems(prev => {
        const newItems = [...prev];
        for (const updatedItem of result) {
          const index = newItems.findIndex(item => item.id === updatedItem.id);
          if (index !== -1) {
            newItems[index] = updatedItem;
          }
        }
        return newItems;
      });
      
      // Clear pending changes for updated items
      setPendingChanges(prev => {
        const newMap = new Map(prev);
        updatedItems.forEach(item => {
          newMap.delete(item.id);
        });
        return newMap;
      });

      return result;
    } catch (error) {
      console.error('Failed to batch update:', error);
      throw error;
    } finally {
      setSavingItems(prev => {
        const newSet = new Set(prev);
        itemIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  }, [onBatchUpdate]);

  // Delete handler
  const deleteItem = useCallback(async (itemId: string) => {
    let originalItems: ContentItem[] = [];
    setRawItems(currentItems => {
      originalItems = currentItems;
      return currentItems.filter(item => item.id !== itemId);
    });

    setPendingChanges(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemId);
      return newMap;
    });

    try {
      const response = await fetch(`/api/admin/content/${collection.slug}/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Server responded with an error');
      }

      toast.success('Item deleted successfully.');
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Failed to delete item. Restoring...');
      setRawItems(originalItems);
    }
  }, [collection.slug]);

  // Computed values
  const pendingChangesCount = useMemo(() => {
    return Array.from(pendingChanges.values()).reduce((count, change) => {
      const item = rawItems.find(i => i.id === change.itemId);
      if (!item || (item as any).status !== 'published') return count;

      const { changes } = change;
      const topLevelKeys = Object.keys(changes).filter(key => key !== 'data');
      const dataKeysCount = (changes.data && typeof changes.data === 'object') ? Object.keys(changes.data).length : 0;
      return count + topLevelKeys.length + dataKeysCount;
    }, 0);
  }, [pendingChanges, rawItems]);

  const hasPendingChanges = (itemId: string) => pendingChanges.has(itemId);

  const hasPendingChangeForField = useCallback((itemId: string, fieldName: string): boolean => {
    const pendingChange = pendingChanges.get(itemId);
    if (!pendingChange) return false;

    const { changes } = pendingChange;
    const isSystemField = ['title', 'slug', 'seoTitle', 'seoDescription', 'ogImage', 'status'].includes(fieldName);

    if (isSystemField) {
      return Object.prototype.hasOwnProperty.call(changes, fieldName);
    } else {
      return Object.prototype.hasOwnProperty.call(changes.data || {}, fieldName);
    }
  }, [pendingChanges]);

  // Cleanup function
  useEffect(() => {
    return () => {
      debouncedSaveDraft.cancel();
      debouncedSaveItem.cancel();
    };
  }, [debouncedSaveDraft, debouncedSaveItem]);

  return {
    items,
    pendingChanges,
    savingItems,
    pendingChangesCount,
    updateField,
    togglePublish,
    republishItem,
    clearPendingChanges,
    batchUpdate,
    deleteItem,
    hasPendingChanges,
    hasPendingChangeForField,
  };
} 