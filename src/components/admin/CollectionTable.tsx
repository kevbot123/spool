'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ContentItem, CollectionConfig, FieldConfig } from '@/types/cms';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  FilterFn,
  ColumnResizeMode,
  ColumnSizingState,
  ColumnOrderState,
} from '@tanstack/react-table';
import { FieldEditor } from './FieldEditor';
import { DetailPanel } from './DetailPanel';
import { CollectionHeader } from './CollectionHeader';
import {
  MoreHorizontal,
  Trash2,
  GripVertical,
  MoreVertical,
  RefreshCcw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { debounce } from 'lodash';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TbLayoutSidebarRightExpand } from 'react-icons/tb';
import { getFieldTypeIcon } from '@/lib/field-type-icons';
import clsx from 'clsx';
import { toast } from 'sonner';

interface CollectionTableProps {
  collection: CollectionConfig;
  items: ContentItem[];
  onBatchUpdate: (items: ContentItem[]) => Promise<ContentItem[]>;
  onDelete: (id: string) => Promise<void>;
  onCreate: () => void;
  authToken: string | null;
}

interface PendingChange {
  itemId: string;
  changes: Partial<ContentItem>;
}

interface RowMenuProps {
  onDelete: () => void;
  onTogglePublish: () => void;
  isPublished: boolean;
  viewUrl: string;
  hasPendingChanges?: boolean;
  onRepublish?: () => void;
}

interface DraggableHeaderProps {
  header: any;
  children: React.ReactNode;
  isLastHeader: boolean;
  fieldType?: FieldConfig['type'];
}

function DraggableHeader({ header, children, isLastHeader, fieldType }: DraggableHeaderProps) {
  const { isDragging, setNodeRef, transform, transition, listeners, attributes } = useSortable({
    id: header.id,
  });

  const style = {
    opacity: isDragging ? 0.8 : 1,
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 'auto',
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
    // Only allow sorting if the click didn't come from the drag handle
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Allow normal sorting behavior
    if (header.column.getCanSort()) {
      header.column.getToggleSortingHandler()?.(e);
    }
  };

  // Get the icon for this field type
  const FieldTypeIcon = fieldType ? getFieldTypeIcon(fieldType) : null;
  const isDraggableColumn = header.column.id !== 'system_title' && header.column.id !== 'more-actions';

  return (
    <th
      ref={setNodeRef}
      style={{
        width: header.getSize(),
        minWidth: header.getSize(),
        maxWidth: header.getSize(),
        ...style,
      }}
      className={`py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-visible relative group ${
        header.column.getCanSort() && header.column.id !== 'more-actions'
          ? 'cursor-pointer hover:bg-gray-100'
          : ''
      }`}
      onClick={handleHeaderClick}
    >
      <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-nowrap overflow-hidden">
        {/* Field type icon by default, drag handle on hover - only for draggable columns */}
        {isDraggableColumn && (
          <div
            className="drag-handle cursor-move active:cursor-grabbing relative"
            {...listeners}
            {...attributes}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Field type icon - visible by default */}
            {FieldTypeIcon && (
              <FieldTypeIcon 
                size={14} 
                className="text-gray-400 group-hover:opacity-0 transition-opacity duration-200" 
              />
            )}
            {/* Drag handle - visible on hover */}
            <GripVertical 
              size={14} 
              className="text-gray-400 absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
            />
          </div>
        )}
        {children}
        {header.column.getIsSorted() && (
          <span>
            {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
      {header.column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={() => header.column.resetSize()}
          className={`resizer ${header.column.getIsResizing() ? 'isResizing' : ''}`}
        />
      )}
      {!isLastHeader && (
        <div className="absolute top-0 right-0 h-full w-px bg-gray-200" />
      )}
    </th>
  );
}

function RowMenu({ onDelete, onTogglePublish, isPublished, viewUrl, hasPendingChanges, onRepublish }: RowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="py-1 !px-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200/80 rounded-md"
          title="More options"
        >
          <MoreVertical size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isPublished && hasPendingChanges && onRepublish && (
          <>
            <DropdownMenuItem
              onClick={onRepublish}
              className="flex items-center w-full px-4 py-1 text-sm cursor-pointer text-blue-600 hover:bg-blue-50"
            >
              <RefreshCcw size={14} className="mr-2" />
              <span>Republish edits</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center w-full px-4 py-1 text-sm cursor-pointer"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>View Post</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onTogglePublish}
          className="flex items-center w-full px-4 py-1 text-sm cursor-pointer"
        >
          {isPublished ? (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
              </svg>
              <span>Unpublish</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Publish</span>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            if (confirm('Are you sure you want to delete this item?')) {
              onDelete();
            }
          }}
          className="flex items-center w-full px-4 py-1 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
        >
          <Trash2 size={14} className="mr-2" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface BulkActionsDropdownProps {
  onPublishAll: () => void;
  onUnpublishAll: () => void;
  collection: CollectionConfig;
}

function BulkActionsDropdown({ onPublishAll, onUnpublishAll, collection }: BulkActionsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md"
          title="Bulk actions"
        >
          <MoreHorizontal size={16} className="min-w-4 min-h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={onPublishAll}
          className="flex items-center w-full px-4 py-2 text-sm cursor-pointer"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Publish all
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={onUnpublishAll}
          className="flex items-center w-full px-4 py-2 text-sm cursor-pointer"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
          </svg>
          Unpublish all
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a
            href={`/${collection.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center w-full px-4 py-2 text-sm cursor-pointer"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>Visit {collection.name}</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CollectionTable({
  collection,
  items,
  onBatchUpdate,
  onDelete,
  onCreate,
  authToken
}: CollectionTableProps) {
  const [localCollection, setLocalCollection] = useState<CollectionConfig>(collection);
  const [localItems, setLocalItems] = useState(items);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const pendingCellEditsCount = useMemo(() => {
    return Array.from(pendingChanges.values()).reduce((count, change) => {
      const { changes } = change;
      const topLevelKeys = Object.keys(changes).filter(key => key !== 'data');
      const dataKeysCount = (changes.data && typeof changes.data === 'object') ? Object.keys(changes.data).length : 0;
      return count + topLevelKeys.length + dataKeysCount;
    }, 0);
  }, [pendingChanges]);

  const hasPendingChangeForCell = useCallback((itemId: string, fieldName: string): boolean => {
    const pendingChange = pendingChanges.get(itemId);
    if (!pendingChange) return false;

    const { changes } = pendingChange;
    // System fields are at the top level of the `changes` object
    const isSystemField = ['title', 'slug', 'body', 'seoTitle', 'seoDescription', 'ogImage', 'status'].includes(fieldName);

    if (isSystemField) {
        return Object.prototype.hasOwnProperty.call(changes, fieldName);
    } else {
        // Custom fields are inside the `data` property
        return Object.prototype.hasOwnProperty.call(changes.data || {}, fieldName);
    }
  }, [pendingChanges]);

  const storageKey = `table-column-sizing-${collection.name}`;
  const orderStorageKey = `table-column-order-${collection.name}`;

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    })
  );

  // Load column sizing from localStorage
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        setColumnSizing(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error reading column sizing from localStorage', error);
    }
  }, [storageKey]);

  // Define column order, excluding the fixed "more-actions" column - memoized to prevent infinite re-renders
  const initialColumnOrder = useMemo(() => [
    'system_status',
    'system_title',
    'system_slug',
    'system_ogImage',
    ...localCollection.fields
      .filter(field => !['body', 'title', 'slug', 'ogImage', 'seoTitle', 'seoDescription'].includes(field.name))
      .map(field => `field_${field.name}`)
  ], [localCollection.fields]);

  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(initialColumnOrder);

  // Load column order from localStorage
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(orderStorageKey);
      if (saved) {
        const savedOrder = JSON.parse(saved);
        
        // If saved order doesn't include system_status, reset to initial order
        if (!savedOrder.includes('system_status')) {
          setColumnOrder(initialColumnOrder);
          return;
        }
        
        // Merge with initial order to handle new fields, but ensure status and title are first
        const mergedOrder = [
          'system_status',  // Always first
          'system_title',   // Always second
          ...savedOrder.filter((id: string) => 
            id !== 'system_status' && 
            id !== 'system_title' && 
            initialColumnOrder.includes(id)
          ),
          ...initialColumnOrder.filter((id: string) => 
            id !== 'system_status' && 
            id !== 'system_title' && 
            !savedOrder.includes(id)
          )
        ];
        setColumnOrder(mergedOrder);
      }
    } catch (error) {
      console.error('Error reading column order from localStorage', error);
    }
  }, [orderStorageKey]); // Removed initialColumnOrder from dependencies

  // Get draggable column IDs (exclude fixed columns)
  const draggableColumnIds = columnOrder.filter(columnId => 
    columnId && 
    columnId !== 'system_status' &&
    columnId !== 'system_title' &&
    columnId !== 'more-actions'
  );

  // Save column sizing to localStorage
  useEffect(() => {
    if (Object.keys(columnSizing).length > 0) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(columnSizing));
      } catch (error) {
        console.error('Error saving column sizing to localStorage', error);
      }
    }
  }, [columnSizing, storageKey]);

  // Save column order to localStorage
  useEffect(() => {
    if (columnOrder.length > 0) {
      try {
        window.localStorage.setItem(orderStorageKey, JSON.stringify(columnOrder));
      } catch (error) {
        console.error('Error saving column order to localStorage', error);
      }
    }
  }, [columnOrder, orderStorageKey]);

  const debouncedSaveDraft = useMemo(
    () => debounce(async (itemId: string, changes: Partial<ContentItem>, slug: string) => {
      try {
        await fetch(`/api/admin/content/${slug}/${itemId}/draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        });
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }, 1000), // Debounce by 1 second
    []
  );

  // On initial load, reconstruct pendingChanges from draft data in items (only for published items)
  useEffect(() => {
    const initialPendingChanges = new Map<string, PendingChange>();
    if (items) {
      items.forEach(item => {
        if (!item.publishedAt || !item.draft || Object.keys(item.draft).length === 0) return;

        const draft = item.draft as any;
        const changes: any = {};

        // Check top-level fields in draft
        Object.keys(draft).forEach(key => {
          if (key === 'data') return; // handle separately
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
    }

    if (initialPendingChanges.size > 0) {
      setPendingChanges(initialPendingChanges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]); // Only run when the initial items are loaded

  useEffect(() => {
    // Sync localItems whenever `items` from props change.
    // For published items with draft data, merge the draft into the displayed values
    const itemsWithDraftMerged = items.map(item => {
      // Only merge draft data for published items
      if (item.publishedAt && item.draft && Object.keys(item.draft).length > 0) {
        return {
          ...item,
          ...item.draft,
          data: {
            ...(item.data || {}),
            ...((item.draft as any).data || {}),
          },
        };
      }
      return item;
    });
    
    setLocalItems(itemsWithDraftMerged);
  }, [items]);
  
  // When pending changes are updated, save them as a draft (only for published items)
  useEffect(() => {
    pendingChanges.forEach((change, itemId) => {
      const item = localItems.find(i => i.id === itemId);
      // Only save drafts for published items
      if (item?.publishedAt) {
        debouncedSaveDraft(itemId, change.changes, localCollection.slug);
      }
    });
  }, [pendingChanges, debouncedSaveDraft, localItems, localCollection.slug]);

  const saveAllChanges = useCallback(async () => {
    if (pendingChanges.size === 0) return;

    debouncedSaveDraft.cancel();

    const changesToSave = Array.from(pendingChanges.values());
    const itemsToUpdate: ContentItem[] = [];

    for (const change of changesToSave) {
      const item = localItems.find(i => i.id === change.itemId);
      // Only process changes for published items (unpublished items are saved immediately)
      if (item && item.publishedAt) {
        const updatedItem = {
          ...item,
          ...change.changes,
          data: {
            ...(item.data || {}),
            ...((change.changes as any).data || {}),
          },
        };
        itemsToUpdate.push(updatedItem);
      }
    }

    if (itemsToUpdate.length > 0) {
      const itemIds = itemsToUpdate.map(i => i.id);
      setSavingItems(new Set(itemIds));

      try {
        // This onBatchUpdate will now hit the PUT endpoint, which publishes the changes
        const updatedItems = await onBatchUpdate(itemsToUpdate);
        
        setLocalItems(prev => {
          const newItems = [...prev];
          for (const updatedItem of updatedItems) {
            const index = newItems.findIndex(item => item.id === updatedItem.id);
            if (index !== -1) {
              // Only update the saved item, preserving any local edits to other items
              newItems[index] = updatedItem;
            }
          }
          return newItems;
        });
        
        // Only clear pending changes for the items that were actually saved (published items)
        setPendingChanges(prev => {
          const newMap = new Map(prev);
          itemsToUpdate.forEach(item => {
            newMap.delete(item.id);
          });

          return newMap;
        });
      } catch (error) {
        console.error('Failed to save batch items:', error);
      } finally {
        setSavingItems(new Set());
      }
    }
  }, [pendingChanges, localItems, onBatchUpdate, debouncedSaveDraft]);

  const handleRepublishSingleItem = useCallback(async (itemId: string) => {
    debouncedSaveDraft.cancel();
    const change = pendingChanges.get(itemId);
    const item = localItems.find(i => i.id === itemId);

    if (!change || !item) return;

    // This item must be published to have pending changes that can be republished
    if (!item.publishedAt) return;

    const updatedItem = {
      ...item,
      ...change.changes,
      data: {
        ...(item.data || {}),
        ...((change.changes as any).data || {}),
      },
    };

    setSavingItems(prev => new Set(prev).add(itemId));

    try {
      // onBatchUpdate expects an array
      const [republishedItem] = await onBatchUpdate([updatedItem]);
      
      setLocalItems(prev => {
        const newItems = [...prev];
        const index = newItems.findIndex(i => i.id === republishedItem.id);
        if (index !== -1) {
          // The republished item from server has draft cleared, so it's the new source of truth
          newItems[index] = republishedItem;
        }
        return newItems;
      });
      
      // Remove from pending changes
      setPendingChanges(prev => {
        const newMap = new Map(prev);
        newMap.delete(itemId);
        return newMap;
      });
    } catch (error) {
      console.error('Failed to republish single item:', error);
      // Maybe add some UI to show error, for now just log
    } finally {
      setSavingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [pendingChanges, localItems, onBatchUpdate, debouncedSaveDraft]);

  // Handle publish/unpublish toggle
  const handleTogglePublish = useCallback(async (itemId: string) => {
    const item = localItems.find(i => i.id === itemId);
    if (!item) return;

    const isCurrentlyPublished = !!item.publishedAt;
    const newPublishedAt = isCurrentlyPublished ? null : new Date().toISOString();

    try {
      const response = await fetch(`/api/admin/content/${localCollection.slug}/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedAt: newPublishedAt }),
      });

      if (!response.ok) {
        toast.error(`Failed to ${isCurrentlyPublished ? 'unpublish' : 'publish'} "${item.title}"`);
        throw new Error('Failed to update publish status');
      }

      const updatedItem = await response.json();
      
      // Update local state - only update publishedAt to preserve local edits
      setLocalItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, publishedAt: updatedItem.publishedAt } : i
      ));

      // If item was unpublished and has pending changes, remove from pending changes
      // since unpublished items save immediately
      if (isCurrentlyPublished && !updatedItem.publishedAt) {
        setPendingChanges(prev => {
          const newMap = new Map(prev);
          newMap.delete(itemId);
          return newMap;
        });
      }

      toast.success(`${updatedItem.publishedAt ? 'Published' : 'Unpublished'} "${item.title || 'Item'}".`);
    } catch (error) {
      console.error('Failed to toggle publish status:', error);
    }
  }, [localItems, localCollection.slug]);

  // Handle field updates
  const handleFieldUpdate = useCallback(async (itemId: string, field: string, value: any) => {
    const item = localItems.find(i => i.id === itemId);
    if (!item) return;

    const isSystemField = ['title', 'slug', 'body', 'seoTitle', 'seoDescription', 'ogImage', 'status'].includes(field);
    const isPublished = !!item.publishedAt;

    // Get the current value to check if it actually changed
    const currentValue = isSystemField ? (item as any)[field] : item.data?.[field];
    
    // Don't do anything if the value hasn't actually changed
    if (currentValue === value) {
      return;
    }

    // Update local state immediately
    setLocalItems(prev => prev.map(item => {
      if (item.id === itemId) {
        if (isSystemField) {
          return { ...item, [field]: value };
        } else {
          return { ...item, data: { ...(item.data || {}), [field]: value } };
        }
      }
      return item;
    }));

    if (isPublished) {
      // For published items, use the draft mechanism
      setPendingChanges(prev => {
        const newChanges = new Map(prev);
        const existing = newChanges.get(itemId) || { itemId, changes: {} };
        
        let updatedChanges;
        if (isSystemField) {
          updatedChanges = { ...existing.changes, [field]: value };
        } else {
          updatedChanges = { 
            ...existing.changes, 
            data: { 
              ...((existing.changes as any).data || {}), 
              [field]: value 
            } 
          };
        }
        
        newChanges.set(itemId, { itemId, changes: updatedChanges });
        return newChanges;
      });
    } else {
      // For unpublished items, save immediately
      try {
        setSavingItems(prev => new Set(prev).add(itemId));
        
        const updatePayload = isSystemField 
          ? { [field]: value }
          : { data: { ...(item.data || {}), [field]: value } };

        const response = await fetch(`/api/admin/content/${localCollection.slug}/${itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          throw new Error('Failed to save changes');
        }

        const updatedItem = await response.json();
        
        // Update local state with server response
        setLocalItems(prev => prev.map(i => 
          i.id === itemId ? updatedItem : i
        ));
      } catch (error) {
        console.error('Failed to save changes:', error);
        // Revert the local change on error
        setLocalItems(prev => prev.map(item => {
          if (item.id === itemId) {
            if (isSystemField) {
              return { ...item, [field]: (item as any)[field] };
            } else {
              const originalData = { ...item.data };
              delete originalData[field];
              return { ...item, data: originalData };
            }
          }
          return item;
        }));
      } finally {
        setSavingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }
    }
  }, [localItems, localCollection.slug]);

  const handleDelete = async (itemId: string) => {
    // No need to manage pending changes here anymore, as the item will be deleted
    await onDelete(itemId);
  };

  const handleBulkAction = useCallback(async (action: 'publish' | 'unpublish') => {
    const currentDate = new Date().toISOString();
    const updatedItems = localItems.map(item => ({
      ...item,
      publishedAt: action === 'publish' ? (item.publishedAt || currentDate) : null,
    }));

    try {
      // Optimistically update UI - only update publishedAt to preserve local edits
      setLocalItems(prev => prev.map(item => ({
        ...item,
        publishedAt: action === 'publish' ? (item.publishedAt || currentDate) : null,
      })));

      // If unpublishing, clear pending changes for items that were previously published
      if (action === 'unpublish') {
        setPendingChanges(prev => {
          const newMap = new Map(prev);
          localItems.forEach(item => {
            if (item.publishedAt) { // Was published, now being unpublished
              newMap.delete(item.id);
            }
          });
          return newMap;
        });
      }

      // Persist to server
      await onBatchUpdate(updatedItems);
    } catch (error) {
      console.error(`Failed to ${action} all items:`, error);
      // Revert if server call fails
      setLocalItems(localItems);
    }
  }, [localItems, onBatchUpdate]);

  // Stable callbacks so CollectionHeader's effect doesn't fire every render
  const publishAll = useCallback(() => handleBulkAction('publish'), [handleBulkAction]);
  const unpublishAll = useCallback(() => handleBulkAction('unpublish'), [handleBulkAction]);

  // Handle drag start
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  // Handle drag end
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (active.id !== over?.id && over?.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(items, oldIndex, newIndex);
          return newOrder;
        }
        return items;
      });
    }
  }

  // Create columns from collection fields
  const columns: ColumnDef<ContentItem>[] = [

    // Status column (sticky with title)
    {
      id: 'system_status',
      header: '',
      size: 40, // Small width for just the status indicator
      enableSorting: false,
      enableResizing: false,
      cell: ({ row }) => {
        const isPublished = !!row.original.publishedAt;
        return (
          <div className="flex items-center justify-center">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isPublished ? 'bg-green-400' : 'bg-gray-300'
              }`}
              title={isPublished ? 'Published' : 'Draft'}
            />
          </div>
        );
      },
    },

    // Title column (always second and sticky)
    {
      id: 'system_title', // Unique ID to avoid conflicts
      accessorKey: 'title',
      header: 'Title',
      size: 200, // Default size for Title
      cell: ({ row, getValue, column }) => {
        const isEditing = editingCell?.rowId === row.original.id && editingCell?.field === 'title';
        const isSaving = savingItems.has(row.original.id);

        return (
          <>
            <FieldEditor
              field={{ name: 'title', type: 'text', required: true, label: 'Title' }}
              value={getValue() as string}
              isEditing={isEditing}
              onEdit={() => setEditingCell({ rowId: row.original.id, field: 'title' })}
              onSave={(value: any) => {
                handleFieldUpdate(row.original.id, 'title', value);
                setEditingCell(null);
              }}
              onCancel={() => setEditingCell(null)}
              width={column.getSize()}
              authToken={authToken}
            />
            {isSaving && (
              <div className="absolute -right-6 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </>
        );
      },
    },
    // Slug column
    {
      id: 'system_slug',
      accessorKey: 'slug',
      header: 'Slug',
      size: 150, // Default size for Slug
      cell: ({ row, getValue, column }) => {
        const isEditing = editingCell?.rowId === row.original.id && editingCell?.field === 'slug';
        const isSaving = savingItems.has(row.original.id);

        return (
          <>
            <FieldEditor
              field={{ name: 'slug', type: 'text', required: true, label: 'Slug' }}
              value={getValue() as string}
              isEditing={isEditing}
              onEdit={() => setEditingCell({ rowId: row.original.id, field: 'slug' })}
              onSave={(value: any) => {
                handleFieldUpdate(row.original.id, 'slug', value);
                setEditingCell(null);
              }}
              onCancel={() => setEditingCell(null)}
              width={column.getSize()}
              authToken={authToken}
            />
            {isSaving && (
              <div className="absolute -right-6 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </>
        );
      },
    },
    // System fields that should always appear (like ogImage, seoTitle, seoDescription)
    {
      id: 'system_ogImage',
      accessorKey: 'ogImage',
      header: 'OG Image',
      size: 120,
      cell: ({ row, getValue, column }) => {
        const isEditing = editingCell?.rowId === row.original.id && editingCell?.field === 'ogImage';
        const isSaving = savingItems.has(row.original.id);

        return (
          <>
            <FieldEditor
              field={{ name: 'ogImage', type: 'image', required: false, label: 'OG Image' }}
              value={getValue() as string}
              isEditing={isEditing}
              onEdit={() => setEditingCell({ rowId: row.original.id, field: 'ogImage' })}
              onSave={(value: any) => {
                handleFieldUpdate(row.original.id, 'ogImage', value);
                setEditingCell(null);
              }}
              onCancel={() => setEditingCell(null)}
              width={column.getSize()}
              authToken={authToken}
            />
            {isSaving && (
              <div className="absolute -right-6 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </>
        );
      },
    },
    // Dynamic columns from collection fields
    ...localCollection.fields
      .filter(field => !['body', 'title', 'slug', 'ogImage', 'seoTitle', 'seoDescription'].includes(field.name)) // Exclude system fields handled separately
      .map((field, index): ColumnDef<ContentItem> => ({
        accessorFn: (row) => {
          // For system fields, access from top level, otherwise from data
          const isSystemField = ['seoTitle', 'seoDescription', 'ogImage', 'status'].includes(field.name);
          return isSystemField ? (row as any)[field.name] : row.data[field.name];
        },
        id: `field_${field.name}`, // Prefix to ensure uniqueness
        header: field.label,
        size: 150, // Default size for other fields
        cell: ({ row, getValue, column }) => {
          const isEditing = editingCell?.rowId === row.original.id && editingCell?.field === field.name;
          const isSaving = savingItems.has(row.original.id);

          if (field.type === 'boolean') {
            const currentValue = getValue() as boolean;
            return (
              <div className="px-4 py-2 flex items-center">
                <input
                  type="checkbox"
                  checked={currentValue}
                  onChange={(e) => {
                    handleFieldUpdate(row.original.id, field.name, e.target.checked);
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </div>
            );
          }

          if (field.type === 'body') {
            return (
              <button
                onClick={() => setSelectedItem(row.original)}
                className="text-sm text-primary hover:underline"
              >
                Edit content
              </button>
            );
          }

          return (
            <>
              <FieldEditor
                field={field}
                value={getValue()}
                isEditing={isEditing}
                onEdit={() => setEditingCell({ rowId: row.original.id, field: field.name })}
                onSave={(value: any) => {
                  handleFieldUpdate(row.original.id, field.name, value);
                  setEditingCell(null);
                }}
                onCancel={() => setEditingCell(null)}
                width={column.getSize()}
                authToken={authToken}
              />
              {isSaving && (
                <div className="absolute -right-6 top-1/2 -translate-y-1/2">
                  <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </>
          );
        },
      })),
  ];

  // Manually order columns to ensure correct positioning
  const statusColumn = columns.find(col => col.id === 'system_status')!;
  const titleColumn = columns.find(col => col.id === 'system_title')!;
  const otherColumns = columns.filter(col => col.id !== 'system_status' && col.id !== 'system_title');
  
  // Memoized row menu component to prevent re-renders
  const MemoizedRowMenu = useMemo(() => {
    return ({ row }: { row: any }) => {
      const isPublished = !!row.original.publishedAt;
      const viewUrl = localCollection.urlPattern.replace('{slug}', row.original.slug);
      const hasPendingChanges = pendingChanges.has(row.original.id);
      
      return (
        <div className="flex items-center justify-center">
          <RowMenu 
            onDelete={() => handleDelete(row.original.id)} 
            onTogglePublish={() => handleTogglePublish(row.original.id)}
            isPublished={isPublished}
            viewUrl={viewUrl}
            hasPendingChanges={hasPendingChanges}
            onRepublish={() => handleRepublishSingleItem(row.original.id)}
          />
        </div>
      );
    };
  }, [localCollection.urlPattern, handleDelete, handleTogglePublish, pendingChanges, handleRepublishSingleItem]);

  // Add the "more actions" column
  const moreActionsColumn: ColumnDef<ContentItem> = {
    id: 'more-actions',
    header: '',
    enableSorting: false,
    enableResizing: false,
    size: 36,
    cell: MemoizedRowMenu,
  };

  // Ensure columns are in the correct order: status, title, others, actions
  const allColumns: ColumnDef<ContentItem>[] = [
    statusColumn,
    titleColumn,
    ...otherColumns,
    moreActionsColumn,
  ];

  const table = useReactTable({
    data: localItems,
    columns: allColumns,
    state: {
      sorting,
      globalFilter,
      columnSizing,
      columnOrder: [...columnOrder, 'more-actions'],
    },
    enableColumnResizing: true,
    columnResizeMode: 'onChange' as ColumnResizeMode,
    onColumnSizingChange: setColumnSizing,
    onColumnOrderChange: (updater) => {
      const newOrder = typeof updater === 'function' ? updater([...columnOrder, 'more-actions']) : updater;
      setColumnOrder(newOrder.filter(id => id !== 'more-actions'));
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Update local collection when prop changes
  useEffect(() => {
    setLocalCollection(collection);
  }, [collection]);

  // Callback to handle collection updates from DetailPanel
  const handleCollectionUpdate = useCallback((updatedCollection: CollectionConfig) => {
    setLocalCollection(updatedCollection);
  }, []);

  return (
    <div className="flex flex-col h-full min-w-0">
      <CollectionHeader
        collection={localCollection}
        itemCount={localItems.length}
        pendingChangesCount={pendingCellEditsCount}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        onSaveAll={pendingChanges.size > 0 ? saveAllChanges : undefined}
        onCreate={onCreate}
        onPublishAll={publishAll}
        onUnpublishAll={unpublishAll}
      />
      <style jsx>{`
        .resizer {
          position: absolute;
          right: 0;
          top: 0;
          height: 100%;
          width: 5px;
          background: rgba(0, 0, 0, 0.05);
          cursor: col-resize;
          user-select: none;
          touch-action: none;
        }
        .resizer.isResizing {
          background: blue;
          opacity: 1;
        }
        @media (hover: hover) {
          .resizer:hover {
            background: rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>
      <div className="bg-white shadow-sm flex flex-col flex-1 min-w-0">
        {localItems.length > 0 ? (
          <div className="overflow-x-auto overflow-y-auto flex-grow min-w-0">
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <table className="divide-y-0 divide-gray-200 table-fixed min-w-full" style={{ width: table.getTotalSize() }}>
                <thead className="bg-gray-50">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      <SortableContext
                        items={draggableColumnIds}
                        strategy={horizontalListSortingStrategy}
                      >
                        {headerGroup.headers.map((header, index) => {
                          const isDraggable = draggableColumnIds.includes(header.id);
                          const isLastHeader = index === headerGroup.headers.length - 1;

                          if (isDraggable) {
                            // Get field type for this column
                            let fieldType: FieldConfig['type'] | undefined;
                            
                            // For system fields
                            if (header.id === 'system_slug') {
                              fieldType = 'text';
                            } else if (header.id === 'system_ogImage') {
                              fieldType = 'image';
                            } else if (header.id.startsWith('field_')) {
                              // For dynamic fields, find the field config
                              const fieldName = header.id.replace('field_', '');
                              const field = localCollection.fields.find(f => f.name === fieldName);
                              fieldType = field?.type;
                            }

                            return (
                              <DraggableHeader 
                                key={header.id} 
                                header={header}
                                isLastHeader={isLastHeader}
                                fieldType={fieldType}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </DraggableHeader>
                            );
                          }
                          
                          const isSticky = header.id === 'system_status' || header.id === 'system_title' || header.id === 'more-actions';
                          const isStatusColumn = header.id === 'system_status';
                          const isTitleColumn = header.id === 'system_title';
                          const isActionsColumn = header.id === 'more-actions';
                          
                          return (
                            <th
                              key={header.id}
                              className={`py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-visible relative ${
                                isSticky ? 'sticky z-20 bg-gray-50' : ''
                              } ${header.column.getCanSort() && !isActionsColumn ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                              style={{ 
                                width: header.getSize(), 
                                minWidth: header.getSize(), 
                                maxWidth: header.getSize(),
                                left: isStatusColumn ? 0 : (isTitleColumn ? 40 : undefined), // Title starts after 40px status column
                                right: isActionsColumn ? 0 : undefined,
                              }}
                              onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                            >
                              <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-nowrap overflow-hidden">
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {header.column.getIsSorted() && (
                                  <span className="ml-2">
                                    {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                              {header.column.getCanResize() && (
                                <div
                                  onMouseDown={header.getResizeHandler()}
                                  onTouchStart={header.getResizeHandler()}
                                  onClick={(e) => e.stopPropagation()}
                                  onDoubleClick={() => header.column.resetSize()}
                                  className={`resizer ${header.column.getIsResizing() ? 'isResizing' : ''}`}
                                />
                              )}
                              {!isLastHeader && !isStatusColumn && (
                                <div className="absolute top-0 right-0 h-full w-px bg-gray-200" />
                              )}
                              {isActionsColumn && (
                                <div className="absolute top-0 left-0 h-full w-px bg-gray-200" />
                              )}
                            </th>
                          );
                        })}
                      </SortableContext>
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white">
                  {table.getRowModel().rows.map(row => {
                    const isRowBeingEdited = editingCell?.rowId === row.original.id;
                    return (
                      <tr 
                        key={row.id} 
                        className={`hover:bg-gray-50 group border-b border-gray-200 last:border-b-0 ${
                          isRowBeingEdited ? 'relative z-50' : ''
                        }`}
                      >
                        {row.getVisibleCells().map((cell, index) => {
                        const isActionsColumn = cell.column.id === 'more-actions';
                        const isTitleColumn = cell.column.id === 'system_title';
                        const isStatusColumn = cell.column.id === 'system_status';
                        const isLastCell = index === row.getVisibleCells().length - 1;
                        const isSticky = isStatusColumn || isTitleColumn || isActionsColumn;

                        let fieldName = '';
                        if (cell.column.id.startsWith('system_')) {
                          fieldName = cell.column.id.replace('system_', '');
                        } else if (cell.column.id.startsWith('field_')) {
                          fieldName = cell.column.id.replace('field_', '');
                        }

                        const hasPendingChange = fieldName ? hasPendingChangeForCell(row.original.id, fieldName) : false;
                        const isCellBeingEdited = editingCell?.rowId === row.original.id && editingCell?.field === fieldName;

                        const cellClassName = clsx(
                          'relative text-sm text-gray-900',
                          {
                            'sticky z-10': isSticky,
                            'group': isTitleColumn,
                            'bg-blue-50 group-hover:bg-blue-100': hasPendingChange && !isCellBeingEdited,
                            'bg-white group-hover:bg-gray-50': isSticky && !hasPendingChange,
                          }
                        );

                        return (
                          <td
                            key={cell.id}
                            className={cellClassName}
                            style={{
                              width: cell.column.getSize(),
                              minWidth: cell.column.getSize(),
                              maxWidth: cell.column.getSize(),
                              left: isStatusColumn ? 0 : (isTitleColumn ? 40 : undefined), // Title starts after 40px status column
                              right: isActionsColumn ? 0 : undefined,
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            {/* Open button for title column */}
                            {isTitleColumn && (
                              <button
                                onClick={() => {
                                  let latest = localItems.find(i => i.id === row.original.id) || row.original;
                                  
                                  // If there are pending changes for this item, merge them into the item
                                  const pendingChange = pendingChanges.get(row.original.id);
                                  if (pendingChange) {
                                    latest = {
                                      ...latest,
                                      ...pendingChange.changes,
                                      data: {
                                        ...(latest.data || {}),
                                        ...((pendingChange.changes as any).data || {}),
                                      },
                                    };
                                  }
                                  
                                  setSelectedItem(latest);
                                }}
                                className="absolute right-1.5 top-1/2 gap-1 -translate-y-1/2 flex items-center border border-gray-300 bg-white text-gray-600 hover:text-gray-800 rounded-sm pl-1 pr-2 py-[2px] text-[11px] font-medium opacity-0 group-hover:opacity-100 transition shadow z-10"
                                title="Open"
                              >
                                <TbLayoutSidebarRightExpand size={16} />
                                OPEN
                              </button>
                            )}
                            {!isLastCell && !isStatusColumn && (
                              <div className="absolute top-0 right-0 h-full w-px bg-gray-200" />
                            )}
                            {isActionsColumn && (
                              <div className="absolute top-0 left-0 h-full w-px bg-gray-200" />
                            )}
                          </td>
                        )
                      })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <DragOverlay>
                {activeId && (
                  <div className="bg-white shadow-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider rounded">
                    {table.getColumn(activeId)?.columnDef.header as string}
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500">No items in this collection yet.</p>
              <button
                onClick={onCreate}
                className="mt-4 text-primary hover:underline"
              >
                Create your first {localCollection.name.slice(0, -1).toLowerCase()}
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedItem && authToken && (
        <DetailPanel
          collection={localCollection}
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onFieldUpdate={handleFieldUpdate}
          onTogglePublish={handleTogglePublish}
          authToken={authToken}
          hasPendingChanges={pendingChanges.has(selectedItem.id)}
          onRepublish={handleRepublishSingleItem}
          onCollectionUpdate={handleCollectionUpdate}
        />
      )}
    </div>
  );
}