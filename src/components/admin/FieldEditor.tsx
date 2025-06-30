'use client';

import { useState, useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { FieldConfig } from '@/types/cms';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { validateSlugInput, createUrlSafeSlug } from '@/lib/utils';
import { NotionSelect, NotionMultiSelect } from '@/components/ui/notion-select';

interface FieldEditorProps {
  field: FieldConfig;
  value: any;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
  width: number;
  authToken?: string | null;
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
}: FieldEditorProps) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    if (field.type !== 'image') {
      return;
    }

    // Create a temporary URL for immediate preview
    const tempUrl = URL.createObjectURL(file);
    // Update local state for immediate feedback
    setEditValue(tempUrl);
    
    const formData = new FormData();
    formData.append('file', file);

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
      // Update local state and notify parent only once with final URL
      setEditValue(result.url);
      onSave(result.url);

    } catch (error) {
      console.error('Failed to upload image:', error);
      // Revert to original value on error
      setEditValue(value);
      // Re-throw to allow parent to handle the error if needed
      throw error;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      await handleFiles(e.target.files);
    } catch (error) {
      // Error is already logged in handleFiles
    }
    // Reset the file input so the same file can be selected again if needed
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

  // Handle select and multiselect fields specially - no editing state, direct interaction
  if (field.type === 'select' || field.type === 'multiselect') {
    return (
      <div className="w-full h-full flex items-center px-0 py-0">
        {field.type === 'select' ? (
          <NotionSelect
            options={field.options || []}
            value={value || null}
            onChange={(newValue) => {
              onSave(newValue);
            }}
            placeholder="Select an option..."
            className="w-full border-none shadow-none hover:bg-gray-50"
          />
        ) : (
          <NotionMultiSelect
            options={field.options || []}
            value={value || []}
            onChange={(newValue) => {
              onSave(newValue);
            }}
            placeholder="Select options..."
            className="w-full border-none shadow-none hover:bg-gray-50"
          />
        )}
      </div>
    );
  }

  // NEW: Handle datetime and date fields with direct inline DatePicker interaction
  if (field.type === ('datetime' as any) || field.type === 'date') {
    return (
      <div className="w-full h-full flex items-center px-0 py-0">
        <DatePicker
          date={value ? new Date(value) : undefined}
          setDate={(date) => {
            if (date) {
              onSave(date.toISOString());
            } else {
              onSave(null);
            }
          }}
          disabled={() => false}
          // Make the trigger look inline/notion-like
          className="w-full h-8 px-2 border-0 shadow-none hover:bg-gray-50 justify-start text-left font-normal"
          withTime={field.type === 'datetime'}
        />
      </div>
    );
  }

  // Handle image fields specially - no need for editing state
  if (field.type === 'image') {
    const highlight = isDragging ? 'ring-2 ring-indigo-400' : '';
    return (
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer w-full h-full block text-left px-4 py-0 overflow-hidden ${highlight}`}
        {...dragProps}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        {renderValue(field, editValue ?? value)}
      </div>
    );
  }

  if (!isEditing) {
    const baseClasses = "cursor-pointer w-full h-full block text-left px-4 overflow-hidden py-2";
    return (
      <div
        onClick={onEdit}
        className={baseClasses}
      >
        {renderValue(field, editValue ?? value)}
      </div>
    );
  }

  return (
    <>
      {/* Backdrop to close on click outside */}
      <div
        className="fixed inset-0 z-40"
        onClick={(e) => {
          e.stopPropagation();
          handleSave();
        }}
        aria-hidden="true"
      />
      {(() => {
        // Standard positioning for all fields
        const leftOffset = '-1px';
        const adjustedWidth = width;
        
        switch (field.type) {
          case 'number':
            return (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="number"
                value={editValue ?? ''}
                onChange={(e) => {
                  setEditValue(e.target.value);
                }}
                onBlur={() => {
                  const num = Number(editValue);
                  if (!isNaN(num)) {
                    onSave(num);
                  } else {
                    setEditValue(value); // revert invalid
                  }
                }}
                onKeyDown={handleKeyDown}
                className="absolute block rounded-md border border-gray-200 bg-white px-2 py-1 text-sm shadow-lg focus:outline-none z-50"
                style={{ width: `${adjustedWidth}px`, top: '-1px', left: leftOffset }}
              />
            );
          case 'datetime':
            return (
              <div className="absolute left-0 top-0 z-50" style={{ width: `${adjustedWidth}px`, top: '-1px', left: leftOffset }}>
                 <DatePicker
                    date={editValue ? new Date(editValue) : undefined}
                    setDate={(date) => {
                      if (date) {
                        onSave(date.toISOString());
                      } else {
                        onSave(null);
                      }
                    }}
                    disabled={() => false}
                    className="w-full"
                  />
              </div>
            )

          case 'text':
          default:
            const isSlugField = field.name === 'slug';
            return (
              <TextareaAutosize
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={editValue || ''}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (isSlugField) {
                    // Apply real-time slug validation
                    const cleanedValue = validateSlugInput(inputValue);
                    setEditValue(cleanedValue);
                  } else {
                    setEditValue(inputValue);
                  }
                }}
                onBlur={() => {
                  if (isSlugField) {
                    // On blur, create a fully valid slug
                    const finalSlug = createUrlSafeSlug(editValue || '');
                    setEditValue(finalSlug);
                    onSave(finalSlug);
                  } else {
                    handleSave();
                  }
                }}
                onKeyDown={handleKeyDown}
                className="absolute block rounded-md border border-gray-200 bg-white px-4 py-2 text-sm shadow-lg focus:outline-none resize-none z-50"
                style={{ width: `${adjustedWidth}px`, top: '-1px', left: leftOffset, backgroundColor: 'white' }}
                minRows={1}
                maxRows={20}
                cacheMeasurements
              />
            );
        }
      })()}
    </>
  );
}

function renderValue(field: FieldConfig, value: any): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400">—</span>;
  }

  switch (field.type) {
    case 'datetime':
      return <div className="truncate">{value ? format(new Date(value), 'PPP') : '—'}</div>;
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
      return <div className="truncate">{value || '—'}</div>;

    case 'multiselect':
      if (Array.isArray(value) && value.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 2).map((item: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200"
              >
                {item}
              </span>
            ))}
            {value.length > 2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600 border border-gray-200">
                +{value.length - 2}
              </span>
            )}
          </div>
        );
      }
      return <span className="text-gray-400">—</span>;

    case 'image':
      return (
        <div className="w-[100px] h-[36px] overflow-hidden rounded border border-gray-200 bg-gray-50">
          {value ? (
            <img src={value} alt="image thumbnail" className="object-cover w-full h-full" loading="lazy" />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-xs text-gray-400">No image</div>
          )}
        </div>
      );

    default:
      return <div className="truncate">{String(value)}</div>;
  }
}