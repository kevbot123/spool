'use client';

import { useState, useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { FieldConfig } from '@/types/cms';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { getStatusColor } from '@/lib/status-colors';
import { validateSlugInput, createUrlSafeSlug } from '@/lib/utils';
import { NotionSelect, NotionMultiSelect } from '@/components/ui/notion-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSite } from '@/context/SiteContext';
import TipTapEditor from './TipTapEditor';

interface FieldEditorProps {
  field: FieldConfig;
  value: any;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
  width: number;
  authToken?: string | null;
  referenceOptions?: { label: string; value: string }[];
  showPlaceholder?: boolean;
}

export function FieldEditor({
  field,
  value,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  width,
  authToken,
  referenceOptions,
  showPlaceholder = true,
}: FieldEditorProps) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { currentSite } = useSite();
  
  // Internal popover state for text/number fields to match other field types
  const [internalPopoverOpen, setInternalPopoverOpen] = useState(false);

  const isReferenceField = field.type === 'reference' || field.type === 'multi-reference';
  const isSelectField = field.type === 'select' || field.type === 'reference';
  const isMultiSelectField = field.type === 'multiselect' || field.type === 'multi-reference';

  const loadingRefs = isReferenceField && !referenceOptions;

  useEffect(() => {
    if (internalPopoverOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [internalPopoverOpen]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    if (field.name === 'slug') {
      const finalSlug = createUrlSafeSlug(editValue || '');
      onSave(finalSlug);
    } else {
      onSave(editValue);
    }
    setInternalPopoverOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value); // revert
      setInternalPopoverOpen(false);
      onCancel();
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    if (field.type !== 'image') {
      return;
    }

    const tempUrl = URL.createObjectURL(file);
    setEditValue(tempUrl);
    
    const formData = new FormData();
    formData.append('file', file);
    if (currentSite?.id) {
      formData.append('site_id', currentSite.id);
    }

    const headers: Record<string, string> = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      setEditValue(result.url);
      onSave(result.url);

    } catch (error) {
      console.error('Failed to upload image:', error);
      setEditValue(value);
      throw error;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      await handleFiles(e.target.files);
    } catch (error) {
      // Error is already logged
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const dragProps = {
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        setIsDragging(true);
      }
    },
    onDragLeave: () => setIsDragging(false),
    onDrop: async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      await handleFiles(e.dataTransfer.files);
    }
  };

  if (isSelectField || isMultiSelectField) {
    return (
      <div data-cell-trigger="true" className="w-full h-full flex items-center px-0 py-0">
        {isSelectField ? (
          <NotionSelect
            options={field.type === 'select' ? (field.options || []) : (referenceOptions || [])}
            value={value || null}
            onChange={(newValue) => onSave(newValue)}
            placeholder={showPlaceholder ? (loadingRefs ? "Loading..." : "Select an option...") : ""}
            disabled={loadingRefs}
            className="w-full border-none shadow-none hover:bg-inherit"
            allowClearSelection={field.name !== 'status'}
          />
        ) : (
          <NotionMultiSelect
            options={field.type === 'multiselect' ? (field.options || []) : (referenceOptions || [])}
            value={value || []}
            onChange={(newValue) => onSave(newValue)}
            placeholder={showPlaceholder ? (loadingRefs ? "Loading..." : "Select options...") : ""}
            disabled={loadingRefs}
            className="w-full border-none shadow-none hover:bg-inherit"
          />
        )}
      </div>
    );
  }

  if (field.type === 'datetime' || field.type === 'date') {
    return (
      <div data-cell-trigger="true" className="w-full h-[36px] flex items-center px-0 py-0">
        <DatePicker
          date={value ? new Date(value) : undefined}
          setDate={(date) => onSave(date ? date.toISOString() : null)}
          disabled={() => false}
          className="w-full h-8 px-2 border-0 shadow-none hover:bg-inherit justify-start text-left font-normal truncate whitespace-nowrap"
          hidePlaceholder={!showPlaceholder}
          withTime={field.type === 'datetime'}
        />
      </div>
    );
  }

  if (field.type === 'image') {
    const highlight = isDragging ? 'ring-2 ring-indigo-400' : '';
    return (
      <div
        data-cell-trigger="true"
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer w-full h-[36px] block text-left px-2.5 py-0 overflow-hidden ${highlight}`}
        {...dragProps}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {renderValue(field, editValue ?? value, referenceOptions)}
      </div>
    );
  }

  // Text, number, and markdown fields now use internal state like other fields
  return (
    <Popover open={internalPopoverOpen} onOpenChange={(open) => {
      setInternalPopoverOpen(open);
      if (!open) {
        handleSave();
      }
    }}>
      <PopoverTrigger asChild>
        <div 
          data-cell-trigger="true"
          className="cursor-pointer w-full h-[36px] flex items-center text-left px-2.5 overflow-hidden"
        >
          {renderValue(field, value, referenceOptions)}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className={`p-0 overflow-hidden shadow-lg`}
        style={{ 
          width: field.type === 'markdown' ? '500px' : `${width}px`, 
          maxWidth: '90vw', 
          marginLeft: '-1px' 
        }}
        side="bottom"
        align="start"
        sideOffset={-37}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-tippy-root]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-tippy-root]')) {
            e.preventDefault();
          }
        }}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {(() => {
            switch (field.type) {
              case 'number':
                return (
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="number"
                    value={editValue ?? ''}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="block w-full bg-white px-2 py-1 text-sm focus:outline-none"
                    autoFocus
                  />
                );
              case 'markdown':
                return (
                  <div className="max-h-[70vh] overflow-auto" onKeyDown={(e) => {
                    // Stop propagation to prevent closing popover when pressing escape inside editor
                    e.stopPropagation();
                  }}>
                    <TipTapEditor
                      content={editValue || ''}
                      onChange={(content) => setEditValue(content)}
                      authToken={authToken || ''}
                      showToolbar={false}
                      autoFocus
                    />
                  </div>
                );
              case 'text':
              default:
                const isSlugField = field.name === 'slug';
                return (
                  <TextareaAutosize
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={editValue || ''}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      setEditValue(isSlugField ? validateSlugInput(inputValue) : inputValue);
                    }}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="block w-full bg-white px-2.5 py-2 text-sm focus:outline-none resize-none"
                    minRows={1}
                    maxRows={20}
                    cacheMeasurements
                    autoFocus
                  />
                );
            }
          })()}
        </form>
      </PopoverContent>
    </Popover>
  );
}

function renderValue(field: FieldConfig, value: any, referenceOptions?: { label: string; value: string }[]): React.ReactNode {
  const isEmpty =
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);

  if (isEmpty && field.type !== 'image') {
    return <span className="opacity-0 select-none">&nbsp;</span>;
  }
  
  if (isEmpty && field.type === 'image') {
    return <span className="opacity-0 select-none">&nbsp;</span>;
  }

  switch (field.type) {
    case 'datetime':
      return (
        <div className="truncate whitespace-nowrap">
          {value ? format(new Date(value), 'PP p') : null}
        </div>
      );
    case 'boolean':
      return (
        <input
          type="checkbox"
          checked={!!value}
          disabled
          className="cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
      );

    case 'select':
      if (field.name === 'status' && ['draft', 'published'].includes(value)) {
        const color = getStatusColor(value as any);
        const label = value.charAt(0).toUpperCase() + value.slice(1);
        return (
          <div className="truncate flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
            <span>{label}</span>
          </div>
        );
      }
      return <div className="truncate">{value}</div>;

    case 'reference': {
      if (!referenceOptions) {
        return <div className="truncate text-gray-400">Loading...</div>;
      }
      const selectedOption = referenceOptions.find(opt => opt.value === value);
      return <div className="truncate">{selectedOption?.label || value}</div>;
    }

    case 'multiselect':
    case 'multi-reference': {
      if (!Array.isArray(value) || value.length === 0) {
        return <span />;
      }

      let items: string[] = [];
      if (field.type === 'multi-reference') {
        if (!referenceOptions) {
          return <div className="truncate text-gray-400">Loading...</div>;
        }
        items = value.map(id => {
          const option = referenceOptions.find(opt => opt.value === id);
          return option?.label || id;
        });
      } else {
        items = value;
      }

      return (
        <div className="w-full flex flex-nowrap items-center gap-1 overflow-hidden">
          {items.slice(0, 2).map((item: string, index: number) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200 truncate"
            >
              {item}
            </span>
          ))}
          {items.length > 2 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600 border border-gray-200">
              +{items.length - 2}
            </span>
          )}
        </div>
      );
    }

    case 'image':
      return (
        <div className="w-[100px] h-[36px] overflow-hidden rounded border border-gray-200 bg-gray-50">
          <img src={value} alt="image thumbnail" className="object-cover w-full h-full" loading="lazy" />
        </div>
      );

    case 'markdown':
    case 'body': {
      const plain = typeof value === 'string' ? value.replace(/[#*_`>~\-\[\]!\(\)]+/g, '').replace(/\n+/g, ' ') : '';
      const truncated = plain.length > 80 ? plain.slice(0, 80) + '…' : plain;
      return <div className="truncate">{truncated}</div>;
    }

    default:
      return <div className="truncate">{String(value)}</div>;
  }
}