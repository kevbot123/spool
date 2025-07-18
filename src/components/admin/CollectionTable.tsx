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
  X,
  ChevronsRight,
  ExternalLink,
  Link2,
  SquareArrowOutUpRight,
  TableProperties,
  TextCursorInput,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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
import { getStatusColor } from '@/lib/status-colors';
import { useCollectionData } from '@/hooks/useCollectionData';
import { useSite } from '@/context/SiteContext';
import { DestructiveActionDialog } from '@/components/ui/destructive-action-dialog';

interface CollectionTableProps {
  collection: CollectionConfig;
  items: ContentItem[];
  onBatchUpdate: (items: ContentItem[]) => Promise<ContentItem[]>;
  onDelete: (id: string) => void;
  onCreate: () => void;
  authToken: string | null;
  // Accept the shared collection data hook
  collectionDataHook: ReturnType<typeof useCollectionData>;
  // Callback to refresh data after import
  onImported?: () => void;
}



interface RowMenuProps {
  onDelete: () => void;
  onTogglePublish: () => void;
  isPublished: boolean;
  viewUrl: string;
  hasPendingChanges?: boolean;
  onRepublish?: () => void;
  onClearPending?: () => void;
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
      className={`text-left text-[12px] font-medium text-gray-500 tracking-wide overflow-visible relative group sticky top-0 z-20 bg-gray-50 ${
        header.column.getCanSort() && header.column.id !== 'more-actions'
          ? 'cursor-pointer hover:bg-gray-100'
          : ''
      }`}
      onClick={handleHeaderClick}
    >
      <div className="flex items-center gap-2 px-2.5 py-2 text-nowrap overflow-hidden">
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

function RowMenu({ onDelete, onTogglePublish, isPublished, viewUrl, hasPendingChanges, onRepublish, onClearPending }: RowMenuProps) {
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
        {isPublished && hasPendingChanges && (
          <>
            {onRepublish && (
              <DropdownMenuItem
                onClick={onRepublish}
                className="flex items-center w-full px-4 py-1 text-sm cursor-pointer hover:bg-blue-50"
              >
                <RefreshCcw size={14} className="mr-2" />
                <span>Republish edits</span>
              </DropdownMenuItem>
            )}
            {onClearPending && (
              <DropdownMenuItem
                onClick={onClearPending}
                className="flex items-center w-full px-4 py-1 text-sm cursor-pointer text-gray-700 hover:bg-gray-50"
              >
                <X size={14} className="mr-2" />
                <span>Clear pending edits</span>
              </DropdownMenuItem>
            )}
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

        <DestructiveActionDialog
          trigger={
            <DropdownMenuItem
              onSelect={(e)=>e.preventDefault()}
              className="flex items-center w-full px-4 py-1 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <Trash2 size={14} className="mr-2" />
              <span>Delete</span>
            </DropdownMenuItem>
          }
          title="Delete item?"
          description="Are you sure you want to delete this item? This action cannot be undone."
          onConfirm={onDelete}
        />
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
  const { currentSite } = useSite();
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

        <DropdownMenuSeparator />

        <DestructiveActionDialog
          trigger={
            <DropdownMenuItem
              onSelect={(e)=>e.preventDefault()}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
            >
              Delete collection
            </DropdownMenuItem>
          }
          title={`Delete collection "${collection.name}"?`}
          description={`This will permanently delete the collection and all of its content. This action cannot be undone.`}
          confirmInputText="delete forever"
          onConfirm={async () => {
            try {
              if (!currentSite) {
                alert('No site selected');
                return;
              }
              const resp = await fetch(`/api/admin/collections/${collection.slug}?siteId=${currentSite.id}`, {
                method: 'DELETE',
              });
              if (!resp.ok) throw new Error('Failed to delete collection');
              // Redirect to admin home after deletion
              window.location.href = '/admin';
            } catch (err) {
              console.error('Error deleting collection', err);
              alert('Failed to delete collection');
            }
          }}
        />

        <DropdownMenuSeparator />
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
  authToken,
  collectionDataHook,
  onImported,
}: CollectionTableProps) {
  const tableRowClass = 'h-[37px]';
  const [localCollection, setLocalCollection] = useState<CollectionConfig>(collection);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [referenceOptions, setReferenceOptions] = useState<Map<string, { label: string; value: string }[]>>(new Map());
  
  // Use the centralized data hook
  const {
    items: localItems,
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
  } = collectionDataHook;
  
  // Global click handler to close editing when clicking outside
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // Don't close if clicking inside a popover
      if (target.closest('[data-radix-popover-content]')) {
        return;
      }
      
      // Don't close if clicking on a cell trigger
      if (target.closest('[data-cell-trigger="true"]')) {
        return;
      }
      
      // Close any open editor
      setEditingCell(null);
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Keep the selectedItem reference updated when underlying data changes so the DetailPanel shows live updates.
  useEffect(() => {
    if (selectedItem) {
      const latest = localItems.find(i => i.id === selectedItem.id);
      if (latest && latest !== selectedItem) {
        setSelectedItem(latest);
      }
    }
  }, [localItems, selectedItem]);

  // Helper to know if there are any pending changes for published items
  const hasPublishedPendingChanges = pendingChangesCount > 0;

  const storageKey = `table-column-sizing-${collection.name}`;
  const orderStorageKey = `table-column-order-${collection.name}`;

  // Configure sensors for drag and drop – use distance instead of delay to avoid click lag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // start drag after cursor moves 5px, removing the 100ms hold delay
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
    ...localCollection.fields
      // Exclude fields handled separately or not shown in table view
      .filter(field => !['title', 'slug', 'ogImage', 'seoTitle', 'seoDescription', 'ogTitle', 'ogDescription'].includes(field.name))
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



  // Fetch options for all reference fields in the collection
  useEffect(() => {
    const fetchAllReferenceOptions = async () => {
      const newOptions = new Map<string, { label: string; value: string }[]>();
      const collectionsToFetch = new Set<string>();

      // Find all unique reference collections
      localCollection.fields.forEach(field => {
        if ((field.type === 'reference' || field.type === 'multi-reference') && field.referenceCollection) {
          collectionsToFetch.add(field.referenceCollection);
        }
      });

      // Fetch options for each unique collection
      for (const collectionSlug of collectionsToFetch) {
        try {
          const res = await fetch(`/api/admin/content/${collectionSlug}?limit=1000`); // High limit to get all items
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json?.items)) {
              const opts = json.items.map((item: any) => ({ 
                label: item.title || item.slug || item.id, 
                value: item.id 
              }));
              newOptions.set(collectionSlug, opts);
            }
          }
        } catch (error) {
          console.error(`Failed to fetch reference options for ${collectionSlug}`, error);
        }
      }
      
      setReferenceOptions(newOptions);
    };

    if (localCollection.fields) {
      fetchAllReferenceOptions();
    }
  }, [localCollection]);





  const handleBulkAction = useCallback(async (action: 'publish' | 'unpublish') => {
    const currentDate = new Date().toISOString();
    const updatedItems = localItems.map(item => ({
      ...item,
      status: action === 'publish' ? 'published' : 'draft',
      publishedAt: action === 'publish' ? (item.publishedAt || currentDate) : null,
    }));

    try {
      await batchUpdate(updatedItems);
    } catch (error) {
      console.error(`Failed to ${action} all items:`, error);
    }
  }, [localItems, batchUpdate]);

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

  // Memoized cell components to prevent re-renders during column resizing
  const StatusCell = useCallback(({ row }: { row: any }) => {
    const isPublished = (row.original as any).status === 'published';
    const hasPending = isPublished && pendingChanges.has(row.original.id);

    // Determine underlying status value, fallback to draft
    let status: 'draft' | 'published' = (row.original as any).status || row.original.data?.status || 'draft';

    const colorClass = getStatusColor(status, hasPending);

    let tooltipText: string;
    if (isPublished) {
      tooltipText = hasPending ? 'Pending edits' : 'Published';
    } else {
      tooltipText = 'Draft';
    }

    return (
      <div className="flex items-center justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`w-2 h-2 ml-[10px] rounded-full flex-shrink-0 ${colorClass}`}
            />
          </TooltipTrigger>
          <TooltipContent sideOffset={4}>{tooltipText}</TooltipContent>
        </Tooltip>
      </div>
    );
  }, [pendingChanges]);

  const TitleCell = useCallback(({ row, getValue, column }: { row: any; getValue: () => any; column: any }) => {
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
            updateField(row.original.id, 'title', value);
          }}
          onCancel={() => setEditingCell(null)}
          width={column.getSize()}
          authToken={authToken}
          showPlaceholder={false}
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
  }, [editingCell, savingItems, updateField, authToken]);

  const SlugCell = useCallback(({ row, getValue, column }: { row: any; getValue: () => any; column: any }) => {
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
            updateField(row.original.id, 'slug', value);
          }}
          onCancel={() => setEditingCell(null)}
          width={column.getSize()}
          authToken={authToken}
          showPlaceholder={false}
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
  }, [editingCell, savingItems, updateField, authToken]);

  // Memoized dynamic field cell component
  const DynamicFieldCell = useCallback(({ field, row, getValue, column }: { field: FieldConfig; row: any; getValue: () => any; column: any }) => {
    const isEditing = editingCell?.rowId === row.original.id && editingCell?.field === field.name;
    const isSaving = savingItems.has(row.original.id);

    // Make system-set date fields read-only with reduced opacity
    if (['dateLastModified', 'datePublished'].includes(field.name)) {
      const value = getValue();
      const displayValue = value ? new Date(value as string).toLocaleDateString() : '';
      return (
        <div className="px-2.5 py-2 text-gray-900 opacity-50">
          {displayValue}
        </div>
      );
    }

    if (field.type === 'boolean') {
      const currentValue = getValue() as boolean;
      return (
        <div className="px-2.5 py-2 flex items-center">
          <input
            type="checkbox"
            checked={currentValue}
            onChange={(e) => {
              updateField(row.original.id, field.name, e.target.checked);
            }}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
          />
        </div>
      );
    }

    // 'body' (markdown) fields are edited in-place like other markdown fields

    return (
      <>
        <FieldEditor
          field={field}
          value={getValue()}
          isEditing={isEditing}
          onEdit={() => setEditingCell({ rowId: row.original.id, field: field.name })}
          onSave={(value: any) => {
            updateField(row.original.id, field.name, value);
          }}
          onCancel={() => setEditingCell(null)}
          width={column.getSize()}
          authToken={authToken}
          referenceOptions={
            (field.type === 'reference' || field.type === 'multi-reference') && field.referenceCollection
              ? referenceOptions.get(field.referenceCollection)
              : undefined
          }
          showPlaceholder={false}
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
  }, [editingCell, savingItems, updateField, authToken, referenceOptions]);

  // Memoize columns to prevent re-creation on every render
  const columns: ColumnDef<ContentItem>[] = useMemo(() => [
    // Status column (sticky with title)
    {
      id: 'system_status',
      header: '',
      size: 40, // Small width for just the status indicator
      enableSorting: false,
      enableResizing: false,
      cell: StatusCell,
    },

    // Title column (always second and sticky)
    {
      id: 'system_title', // Unique ID to avoid conflicts
      accessorKey: 'title',
      header: 'Title',
      size: 200, // Default size for Title
      cell: TitleCell,
    },
    // Slug column
    {
      id: 'system_slug',
      accessorKey: 'slug',
      header: 'Slug',
      size: 150, // Default size for Slug
      cell: SlugCell,
    },
    // Dynamic columns from collection fields
    ...localCollection.fields
      // Exclude system or hidden fields from table view
      .filter(field => !['title', 'slug', 'ogImage', 'seoTitle', 'seoDescription', 'ogTitle', 'ogDescription'].includes(field.name))
      .map((field): ColumnDef<ContentItem> => ({
        accessorFn: (row) => {
          if (field.name === 'status') {
            const explicitStatus = (row as any).status || row.data?.status;
            if (explicitStatus) return explicitStatus;

            return row.publishedAt ? 'published' : 'draft';
          }

          // Map system date fields to top-level properties
          if (field.name === 'datePublished') {
            // Show a date only if the item status is explicitly 'published'
            const isPublished = (row as any).status === 'published' || row.data?.status === 'published';
            if (!isPublished) return null;

            // Prefer the canonical publishedAt value, but fall back to any custom data field
            return (row as any).publishedAt || row.data?.datePublished;
          }
          if (field.name === 'dateLastModified') {
            return (row as any).updatedAt || row.data?.dateLastModified || row.data?.lastModified;
          }

          const isTopLevelField = ['seoTitle', 'seoDescription', 'ogImage'].includes(field.name);
          return isTopLevelField ? (row as any)[field.name] : row.data[field.name];
        },
        id: `field_${field.name}`, // Prefix to ensure uniqueness
        header: field.label,
        size: 150, // Default size for other fields
        cell: (props) => <DynamicFieldCell field={field} {...props} />,
      })),
  ], [localCollection.fields, StatusCell, TitleCell, SlugCell, DynamicFieldCell]);

  // Manually order columns to ensure correct positioning
  const statusColumn = columns.find(col => col.id === 'system_status')!;
  const titleColumn = columns.find(col => col.id === 'system_title')!;
  const otherColumns = columns.filter(col => col.id !== 'system_status' && col.id !== 'system_title');
  
  // Memoized row menu component to prevent re-renders
  const MemoizedRowMenu = useMemo(() => {
    return ({ row }: { row: any }) => {
      const isPublished = (row.original as any).status === 'published';
      const viewUrl = localCollection.urlPattern.replace('{slug}', row.original.slug);
      const hasPendingChanges = pendingChanges.has(row.original.id);
      
      return (
        <div className="flex items-center justify-center">
                  <RowMenu 
          onDelete={() => deleteItem(row.original.id)} 
          onTogglePublish={() => togglePublish(row.original.id)}
          isPublished={isPublished}
          viewUrl={viewUrl}
          hasPendingChanges={hasPendingChanges}
          onRepublish={() => republishItem(row.original.id)}
          onClearPending={() => clearPendingChanges(row.original.id)}
        />
        </div>
      );
    };
  }, [localCollection.urlPattern, deleteItem, togglePublish, pendingChanges, republishItem, clearPendingChanges]);

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
        pendingChangesCount={pendingChangesCount}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        onSaveAll={hasPublishedPendingChanges ? async () => {
          // Batch update all pending changes
          const changesToSave = Array.from(pendingChanges.values());
          const itemsToUpdate: ContentItem[] = [];

          for (const change of changesToSave) {
            const item = localItems.find(i => i.id === change.itemId);
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
            await batchUpdate(itemsToUpdate);
          }
        } : undefined}
        onCreate={onCreate}
        onPublishAll={publishAll}
        onUnpublishAll={unpublishAll}
        onImported={onImported}
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
          <div className="flex-grow min-w-0">
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <table className="divide-y-0 divide-gray-200 table-fixed min-w-full border-b" style={{ width: table.getTotalSize() }}>
                <thead className="sticky top-0 z-30 bg-gray-50 border-b border-gray-100">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className={tableRowClass}>
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
                              className={`text-left text-[12px] font-medium text-gray-500 tracking-wide overflow-visible relative ${
                                isSticky ? 'sticky top-0 z-20 bg-gray-50' : ''
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
                              <div className="flex items-center gap-2 px-2.5 py-2 text-nowrap overflow-hidden">
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
                  {table.getRowModel().rows.filter(row => row.original).map(row => {
                    const isRowBeingEdited = editingCell?.rowId === row.original.id;
                    return (
                      <tr 
                        key={row.id} 
                        className={`${tableRowClass} hover:bg-gray-50 group border-b border-gray-200 last:border-b-0 ${
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

                        const hasPendingChange = fieldName ? hasPendingChangeForField(row.original.id, fieldName) : false;
                        const showPendingBackground = hasPendingChange && !!row.original.publishedAt;
                        const isCellBeingEdited = editingCell?.rowId === row.original.id && editingCell?.field === fieldName;

                        const cellClassName = clsx(
                          'relative text-sm text-gray-900',
                          {
                            'sticky z-10': isSticky,
                            'group': isTitleColumn,
                            'bg-blue-50 group-hover:bg-blue-100': showPendingBackground && !isCellBeingEdited,
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
                                  const latestItem = localItems.find(i => i.id === row.original.id) || row.original;
                                  setSelectedItem(latestItem);
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
                  <div className="bg-white shadow-lg border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-500 tracking-wide rounded">
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
                Create your first post
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
          onFieldUpdate={updateField}
          onTogglePublish={togglePublish}
          authToken={authToken}
          hasPendingChanges={hasPendingChanges(selectedItem.id)}
          onRepublish={republishItem}
          onCollectionUpdate={handleCollectionUpdate}
          onDelete={deleteItem}
          onClearPending={clearPendingChanges}
          onBatchUpdate={batchUpdate}
          onDeleteItem={deleteItem}
          collectionDataHook={collectionDataHook}
        />
      )}
    </div>
  );
}