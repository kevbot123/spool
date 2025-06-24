'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ContentItem, CollectionConfig } from '@/types/cms';
import { useForm } from 'react-hook-form';
import TipTapEditor from './TipTapEditor';
import { debounce } from 'lodash';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card } from "@/components/ui/card"
import { DatePicker } from '@/components/ui/date-picker';

interface DetailPanelProps {
  item: ContentItem;
  collection: CollectionConfig;
  onClose: () => void;
  onFieldUpdate: (itemId: string, field: string, value: any) => void;
  authToken: string; // Added to pass to TipTapEditor for media uploads
}

export function DetailPanel({
  item,
  collection,
  onClose,
  onFieldUpdate,
  authToken, // Added authToken prop
}: DetailPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { register, handleSubmit, setValue, watch, formState: { defaultValues } } = useForm({
    defaultValues: {
      title: item.title,
      slug: item.slug,
      seoTitle: item.seoTitle || '',
      seoDescription: item.seoDescription || '',
      ogImage: item.ogImage || '',
      body: item.body || '',
      ...item.data
    }
  });

  const debouncedUpdate = useCallback(
    debounce((field: string, value: any) => {
      onFieldUpdate(item.id, field, value);
    }, 500),
    [onFieldUpdate, item.id]
  );

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (type === 'change' && name) {
        const fieldName = name as keyof typeof value;
        // Check if value has actually changed from default
        if (value[fieldName] !== (defaultValues as any)?.[fieldName]) {
          debouncedUpdate(name, value[name]);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, debouncedUpdate, defaultValues]);
  
  const handleBodyChange = (content: string) => {
    setValue('body', content);
    debouncedUpdate('body', content);
  };

  useEffect(() => {
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 transition-opacity z-40 ${
          isOpen ? 'bg-opacity-0' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl z-50 transform transition-transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between max-h-[55px]">
            <h2 className="text-base font-semibold">Edit {collection.name}</h2>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Title Field - always at top */}
              {collection.fields
                .filter(field => field.name === 'title')
                .map(field => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    {renderField(field, register, setValue, watch, authToken, onFieldUpdate, item.id)}
                  </div>
                ))
              }

              {/* Body Field - Tiptap Editor */}
              {collection.fields.some(f => f.type === 'body') && (
                <TipTapEditor
                  content={watch('body')}
                  onChange={handleBodyChange}
                  authToken={authToken}
                />
              )}


              <Accordion type="single" collapsible className="w-full" defaultValue="seo-settings">
                {/* SEO Settings */}
                <AccordionItem value="seo-settings">
                  <AccordionTrigger className="text-base !pl-0 h-[60px] items-center">SEO Settings</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2 pl-6 pb-6">
                      {collection.fields
                        .filter(field => ['slug', 'seoTitle', 'seoDescription', 'ogImage'].includes(field.name))
                        .map(field => (
                          <div key={field.name}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.label}
                            </label>
                            {renderField(field, register, setValue, watch, authToken, onFieldUpdate, item.id)}
                          </div>
                        ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Additional Fields */}
                <AccordionItem value="additional-fields">
                  <AccordionTrigger className="text-base !pl-0 h-[60px] items-center">Additional Fields</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2 pl-6 pb-6">
                      {collection.fields
                        .filter(field => 
                          !['title', 'body', 'slug', 'seoTitle', 'seoDescription', 'ogImage'].includes(field.name)
                        )
                        .map(field => (
                          <div key={field.name}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.label}
                            </label>
                            {renderField(field, register, setValue, watch, authToken, onFieldUpdate, item.id)}
                          </div>
                        ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function renderField(field: any, register: any, setValue: any, watch: any, authToken: string, onFieldUpdate: (itemId: string, field: string, value: any) => void, itemId: string) {
  switch (field.type) {
    case 'datetime':
      const
        date = watch(field.name) ? new Date(watch(field.name)) : undefined;
      return (
        <DatePicker
          date={date}
          setDate={(date) => {
            setValue(field.name, date ? date.toISOString() : null, { shouldDirty: true });
          }}
          disabled={() => false}
        />
      )
    case 'text':
      return (
        <input
          {...register(field.name, { required: field.required })}
          placeholder={field.placeholder}
          className="text-sm w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      );
      
    case 'select':
      return (
        <select
          {...register(field.name, { required: field.required })}
          className="text-sm w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select...</option>
          {field.options?.map((option: string) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
      
    case 'multi-select':
      return (
        <div className="space-y-2">
          {field.options?.map((option: string) => (
            <label key={option} className="flex items-center gap-2">
              <input
                type="checkbox"
                value={option}
                {...register(field.name)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>
      );
      
    case 'boolean':
      return (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register(field.name)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm">Enable</span>
        </label>
      );
      
    case 'image':
      return <ImageUploadField field={field} value={watch(field.name)} setValue={setValue} authToken={authToken} register={register} onFieldUpdate={(field, value) => onFieldUpdate(itemId, field, value)} />;
      
    default:
      return (
        <textarea
          {...register(field.name, { required: field.required })}
          rows={3}
          className="text-sm w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      );
  }
}

function ImageUploadField({ field, value, setValue, authToken, register, onFieldUpdate }: { field: any, value: string, setValue: any, authToken: string, register: any, onFieldUpdate: (field: string, value: any) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { url } = await response.json();
      // Update the form value
      setValue(field.name, url, { shouldDirty: true });
      // Trigger the parent's update handler with the new URL
      onFieldUpdate(field.name, url);
    } catch (error) {
      console.error('Failed to upload image:', error);
      // TODO: Show an error to the user
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept="image/*"
      />
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
          {value ? (
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={uploading}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Change'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue(field.name, null, { shouldDirty: true });
                onFieldUpdate(field.name, null);
              }}
              className="ml-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {/* Hidden input to store the URL value in the form */}
      <input type="hidden" {...register(field.name)} />
    </div>
  );
}

 