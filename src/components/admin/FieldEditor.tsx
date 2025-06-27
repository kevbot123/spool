'use client';

import { useState, useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { FieldConfig } from '@/types/cms';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';

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
            return (
              <TextareaAutosize
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={editValue || ''}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="absolute block rounded-md border border-gray-200 bg-white px-4 py-2 text-sm shadow-lg focus:outline-none resize-none z-50"
                style={{ width: `${adjustedWidth}px`, top: '-1px', left: leftOffset, backgroundColor: 'white' }}
                minRows={1}
                maxRows={20}
                cacheMeasurements
              />
            );
          case 'select':
            return (
              <div className="absolute left-0 top-0 z-50" style={{ width: `${adjustedWidth}px`, top: '-1px', left: leftOffset }}>
                <div className="bg-white rounded-md shadow-lg border border-gray-200">
                  <select
                    ref={inputRef as React.RefObject<HTMLSelectElement>}
                    value={editValue || ''}
                    onChange={(e) => {
                      setEditValue(e.target.value);
                      onSave(e.target.value);
                    }}
                    onBlur={onCancel}
                    onKeyDown={handleKeyDown}
                    className="w-full block px-4 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Select...</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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