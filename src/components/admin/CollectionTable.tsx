'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
}

interface DraggableHeaderProps {
  header: any;
  children: React.ReactNode;
  isLastHeader: boolean;
}

function DraggableHeader({ header, children, isLastHeader }: DraggableHeaderProps) {
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

  return (
    <th
      ref={setNodeRef}
      style={{
        width: header.getSize(),
        minWidth: header.getSize(),
        maxWidth: header.getSize(),
        ...style,
      }}
      className={`py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-visible relative ${
        header.column.getCanSort() && header.column.id !== 'more-actions'
          ? 'cursor-pointer hover:bg-gray-100'
          : ''
      }`}
      onClick={handleHeaderClick}
    >
      <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-nowrap overflow-hidden">
        {/* Drag handle - only show for draggable columns */}
        {
         header.column.id !== 'system_title' && 
         header.column.id !== 'more-actions' && (
          <div
            className="drag-handle cursor-grab active:cursor-grabbing"
            {...listeners}
            {...attributes}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} className="text-gray-400" />
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

function RowMenu({ onDelete, onTogglePublish, isPublished, viewUrl }: RowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="py-1 !px-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200/80 rounded-md"
          title="More options"
        >
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
  const [localItems, setLocalItems] = useState(items);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  
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

  // Load column order from localStorage
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(orderStorageKey);
      if (saved) {
        const savedOrder = JSON.parse(saved);
        // Merge with initial order to handle new fields
        const mergedOrder = [
          ...savedOrder.filter((id: string) => initialColumnOrder.includes(id)),
          ...initialColumnOrder.filter(id => !savedOrder.includes(id))
        ];
        setColumnOrder(mergedOrder);
      }
    } catch (error) {
      console.error('Error reading column order from localStorage', error);
    }
  }, [orderStorageKey]); // Only depend on the storage key, not initialColumnOrder

  // Define column order, excluding the fixed "more-actions" column
  const initialColumnOrder = [
    'system_title',
    'system_slug',
    'system_ogImage',
    ...collection.fields
      .filter(field => !['body', 'title', 'slug', 'ogImage', 'seoTitle', 'seoDescription'].includes(field.name))
      .map(field => `field_${field.name}`)
  ];

  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(initialColumnOrder);

  // Get draggable column IDs (exclude fixed columns)
  const draggableColumnIds = columnOrder.filter(columnId => 
    columnId && 
    
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

  // Debounced save for draft changes
  const debouncedSaveDraft = useCallback(
    debounce(async (itemId: string, changes: Partial<ContentItem>) => {
      try {
        await fetch(`/api/admin/content/${collection.slug}/${itemId}/draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changes),
        });
        // Maybe add some UI feedback for draft saving
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }, 1000), // Debounce by 1 second
    [collection.slug]
  );

  // On initial load, reconstruct pendingChanges from draft data in items
  useEffect(() => {
    const initialPendingChanges = new Map<string, PendingChange>();
    if (items) {
      items.forEach(item => {
        if (item.draft && Object.keys(item.draft).length > 0) {
          initialPendingChanges.set(item.id, {
            itemId: item.id,
            changes: item.draft,
          });
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
    // The `items` prop now contains the merged draft data from the server.
    setLocalItems(items);
  }, [items]);
  
  // When pending changes are updated, save them as a draft
  useEffect(() => {
    pendingChanges.forEach((change, itemId) => {
      debouncedSaveDraft(itemId, change.changes);
    });
  }, [pendingChanges, debouncedSaveDraft]);

  const saveAllChanges = useCallback(async () => {
    if (pendingChanges.size === 0) return;

    const changesToSave = Array.from(pendingChanges.values());
    const itemsToUpdate: ContentItem[] = [];

    for (const change of changesToSave) {
      const item = localItems.find(i => i.id === change.itemId);
      if (item) {
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
              newItems[index] = updatedItem;
            }
          }
          return newItems;
        });
        
        setPendingChanges(new Map());
      } catch (error) {
        console.error('Failed to save batch items:', error);
      } finally {
        setSavingItems(new Set());
      }
    }
  }, [pendingChanges, localItems, onBatchUpdate]);

  // Handle publish/unpublish toggle
  const handleTogglePublish = useCallback(async (itemId: string) => {
    const item = localItems.find(i => i.id === itemId);
    if (!item) return;

    const isCurrentlyPublished = !!item.publishedAt;
    const newPublishedAt = isCurrentlyPublished ? null : new Date().toISOString();

    console.log('--- Toggling Publish Status ---');
    console.log('Item ID:', itemId);
    console.log('Current title:', item.title);
    console.log('Currently published:', isCurrentlyPublished);
    console.log('New publishedAt:', newPublishedAt);

    try {
      const response = await fetch(`/api/admin/content/${collection.slug}/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedAt: newPublishedAt }),
      });

      if (!response.ok) {
        throw new Error('Failed to update publish status');
      }

      const updatedItem = await response.json();
      console.log('Updated item received:', updatedItem);
      
      // Update local state
      setLocalItems(prev => prev.map(i => 
        i.id === itemId ? updatedItem : i
      ));
    } catch (error) {
      console.error('Failed to toggle publish status:', error);
    }
  }, [localItems, collection.slug]);

  // Handle field updates
  const handleFieldUpdate = useCallback((itemId: string, field: string, value: any) => {
    const isSystemField = ['title', 'slug', 'body', 'seoTitle', 'seoDescription', 'ogImage'].includes(field);

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

    // Add to pending changes
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
  }, []);

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
      // Optimistically update UI
      setLocalItems(updatedItems);

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
        
        console.log('Reordering columns:', {
          activeId: active.id,
          overId: over.id,
          oldIndex,
          newIndex,
          currentOrder: items
        });
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(items, oldIndex, newIndex);
          console.log('New order:', newOrder);
          return newOrder;
        }
        return items;
      });
    }
  }

  // Create columns from collection fields
  const columns: ColumnDef<ContentItem>[] = [

    // Title column (always first and sticky)
    {
      id: 'system_title', // Unique ID to avoid conflicts
      accessorKey: 'title',
      header: 'Title',
      size: 200, // Default size for Title
      cell: ({ row, getValue, column }) => {
        const isEditing = editingCell?.rowId === row.original.id && editingCell?.field === 'title';
        const isSaving = savingItems.has(row.original.id);
        const isPublished = !!row.original.publishedAt;

        return (
          <div className="relative flex items-center pr-20 group">
            {/* Status indicator */}
            <div
              className={`ml-4 mr-2 w-2 h-2 rounded-full flex-shrink-0 ${
                isPublished ? 'bg-green-400' : 'bg-gray-300'
              }`}
              title={isPublished ? 'Published' : 'Draft'}
            />
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
            {/* Open button */}
            <button
              onClick={() => setSelectedItem(row.original)}
              className="absolute right-1.5 top-1/2 gap-1 -translate-y-1/2 flex items-center border border-gray-300 bg-white text-gray-600 hover:text-gray-800 rounded-sm pl-1 pr-2 py-[2px] text-[11px] font-medium opacity-0 group-hover:opacity-100 transition shadow"
              title="Open"
            >
              <TbLayoutSidebarRightExpand size={16} />
              OPEN
            </button>
          </div>
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
    ...collection.fields
      .filter(field => !['body', 'title', 'slug', 'ogImage', 'seoTitle', 'seoDescription'].includes(field.name)) // Exclude system fields handled separately
      .map((field, index): ColumnDef<ContentItem> => ({
        accessorFn: (row) => {
          // For system fields, access from top level, otherwise from data
          const isSystemField = ['seoTitle', 'seoDescription', 'ogImage'].includes(field.name);
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
              {isSaving && pendingChanges.has(row.original.id) && (
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

  // Add the "more actions" column to the columns array
  const allColumns = [
    ...columns,
    // Fixed "more actions" column on the right
    {
      id: 'more-actions',
      header: '',
      enableSorting: false,
      enableResizing: false,
      size: 50,
      cell: ({ row }: { row: any }) => {
        const isPublished = !!row.original.publishedAt;
        const viewUrl = collection.urlPattern.replace('{slug}', row.original.slug);
        
        return (
          <div className="flex items-center justify-center">
            <RowMenu 
              onDelete={() => handleDelete(row.original.id)} 
              onTogglePublish={() => handleTogglePublish(row.original.id)}
              isPublished={isPublished}
              viewUrl={viewUrl}
            />
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: localItems,
    columns: allColumns,
    state: {
      sorting,
      globalFilter,
      columnSizing, // Added columnSizing state
      columnOrder: [...columnOrder, 'more-actions'], // Ensure more-actions is always last
    },
    enableColumnResizing: true, // Enable column resizing
    columnResizeMode: 'onChange' as ColumnResizeMode, // Set resize mode
    onColumnSizingChange: setColumnSizing, // Handler for column size changes
    onColumnOrderChange: (updater) => {
      const newOrder = typeof updater === 'function' ? updater([...columnOrder, 'more-actions']) : updater;
      // Filter out more-actions from the new order since it should always be last
      setColumnOrder(newOrder.filter(id => id !== 'more-actions'));
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // debugTable: true, // Optional: for debugging
    // debugHeaders: true,
    // debugColumns: true,
  });

                    return (
    <div className="flex flex-col h-full min-w-0">
      <CollectionHeader
        collection={collection}
        itemCount={localItems.length}
        pendingChangesCount={pendingChanges.size}
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
                            return (
                              <DraggableHeader 
                                key={header.id} 
                                header={header}
                                isLastHeader={isLastHeader}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </DraggableHeader>
                            );
                          }
                          
                          const isSticky = header.id === 'system_title' || header.id === 'more-actions';
                          return (
                            <th
                              key={header.id}
                              className={`py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-visible relative ${
                                isSticky ? 'sticky z-20 bg-gray-50' : ''
                              } ${
                                header.id === 'more-actions' ? 'right-0' : (header.id === 'system_title' ? 'left-0' : '')
                              } ${header.column.getCanSort() && header.id !== 'more-actions' ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                              style={{ 
                                width: header.getSize(), 
                                minWidth: header.getSize(), 
                                maxWidth: header.getSize(),
                                left: header.id === 'system_title' ? 0 : undefined,
                                right: header.id === 'more-actions' ? 0 : undefined,
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
                              {!isLastHeader && (
                                <div className="absolute top-0 right-0 h-full w-px bg-gray-200" />
                              )}
                              {header.id === 'more-actions' && (
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
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 group border-b border-gray-200 last:border-b-0">
                      {row.getVisibleCells().map((cell, index) => {
                        const isActionsColumn = cell.column.id === 'more-actions';
                        const isTitleColumn = cell.column.id === 'system_title';
                        const isLastCell = index === row.getVisibleCells().length - 1;

                        return (
                          <td
                            key={cell.id}
                            className={`relative text-sm text-gray-900 ${
                              isActionsColumn || isTitleColumn ? 'sticky z-10 bg-white group-hover:bg-gray-50' : ''
                            }`}
                            style={{
                              width: cell.column.getSize(),
                              minWidth: cell.column.getSize(),
                              maxWidth: cell.column.getSize(),
                              left: isTitleColumn ? 0 : undefined,
                              right: isActionsColumn ? 0 : undefined,
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            {!isLastCell && (
                              <div className="absolute top-0 right-0 h-full w-px bg-gray-200" />
                            )}
                            {isActionsColumn && (
                              <div className="absolute top-0 left-0 h-full w-px bg-gray-200" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
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
                Create your first {collection.name.slice(0, -1).toLowerCase()}
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedItem && authToken && (
        <DetailPanel
          collection={collection}
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onFieldUpdate={handleFieldUpdate}
          authToken={authToken}
        />
      )}
    </div>
  );
}