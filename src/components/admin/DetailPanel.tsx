'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ContentItem, CollectionConfig } from '@/types/cms';
import { useForm } from 'react-hook-form';
import TipTapEditor from './TipTapEditor';
import { SEOPreview } from './SEOPreview';
import { debounce } from 'lodash';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { DatePicker } from '@/components/ui/date-picker';
import { useSite } from '@/context/SiteContext';
import { ChevronsRight, ExternalLink, Link2, SquareArrowOutUpRight, TableProperties, TextCursorInput } from 'lucide-react';
import CollectionSetupModal from '@/components/admin/CollectionSetupModal';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getFieldTypeIcon } from '@/lib/field-type-icons';
import { validateSlugInput, createUrlSafeSlug } from '@/lib/utils';
import { NotionSelect, NotionMultiSelect } from '@/components/ui/notion-select';

const SYSTEM_DATE_FIELDS = [
  'createdAt', 'updatedAt', 'publishedAt', 'datePublished', 'lastModified',
  'created_at', 'updated_at', 'published_at', 'last_modified',
  'date_modified', 'modified_at', 'dateLastModified'
];
const SYSTEM_OTHER_FIELDS = ['status'];
const SYSTEM_FIELDS = [...SYSTEM_DATE_FIELDS, ...SYSTEM_OTHER_FIELDS];

const META_FIELDS = [
  'title', 'slug', 'description', // Handled in the "Notion-like" section
  'seoTitle', 'seoDescription', 'ogImage', 'ogTitle', 'ogDescription' // Handled in accordions
];

const ALL_NON_CUSTOM_FIELDS = [...META_FIELDS, ...SYSTEM_FIELDS];

interface DetailPanelProps {
  item: ContentItem;
  collection: CollectionConfig;
  onClose: () => void;
  onFieldUpdate: (itemId: string, field: string, value: any) => void;
  onTogglePublish: (itemId: string) => Promise<void> | void;
  authToken: string; // Added to pass to TipTapEditor for media uploads
  hasPendingChanges?: boolean; // Add this to track pending changes
  onRepublish?: (itemId: string) => Promise<void>; // Add republish handler
  onCollectionUpdate?: (updatedCollection: CollectionConfig) => void; // Add collection update handler
}

export function DetailPanel({
  item,
  collection,
  onClose,
  onFieldUpdate,
  onTogglePublish,
  authToken, // Added authToken prop
  hasPendingChanges = false,
  onRepublish,
  onCollectionUpdate,
}: DetailPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { currentSite } = useSite();
  
  // SEO and OG inheritance states
  const [inheritSeoFromContent, setInheritSeoFromContent] = useState(true);
  const [inheritOgFromSeo, setInheritOgFromSeo] = useState(true);
  
  // Collection modal state
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);

  // Local copy of collection to allow live updates
  const [localCollection, setLocalCollection] = useState<CollectionConfig>(collection);

  const { register, handleSubmit, setValue, watch, formState: { defaultValues }, reset } = useForm<any>();

  // Set form values whenever item changes
  useEffect(() => {
    // For the title, check for draft data first, then item.title (don't fallback to data.title as it's outdated)
    const title = (item.draft?.title !== undefined ? item.draft.title : item.title) || '';
    setValue('title', title);
    
    const slug = (item.draft?.slug !== undefined ? item.draft.slug : item.slug) || '';
    setValue('slug', slug);
    
    const seoTitle = (item.draft?.seoTitle !== undefined ? item.draft.seoTitle : item.seoTitle) || '';
    setValue('seoTitle', seoTitle);
    
    const seoDescription = (item.draft?.seoDescription !== undefined ? item.draft.seoDescription : item.seoDescription) || '';
    setValue('seoDescription', seoDescription);
    
    const ogImage = (item.draft?.ogImage !== undefined ? item.draft.ogImage : item.ogImage) || '';
    setValue('ogImage', ogImage);
    
    const body = (item.draft?.body !== undefined ? item.draft.body : item.body) || '';
    setValue('body', body);
    
    const description = (item.draft?.data?.description !== undefined ? item.draft.data.description : (item.data as any)?.description) || '';
    setValue('description', description);
    
    const status = (item.draft?.status !== undefined ? item.draft.status : item.status) || (item.data as any)?.status || 'draft';
    setValue('status', status);
    
    setValue('datePublished', (item as any).datePublished || (item.data as any)?.datePublished || item.publishedAt || '');
    setValue('dateLastModified', (item as any).dateLastModified || (item.data as any)?.dateLastModified || item.updatedAt || '');
    setValue('publishedAt', item.publishedAt || '');
    
    // Set any custom fields from item.data, preferring draft data
    if (item.data) {
      Object.keys(item.data).forEach(key => {
        const draftValue = item.draft?.data?.[key];
        const finalValue = draftValue !== undefined ? draftValue : (item.data as any)[key];
        setValue(key, finalValue);
      });
    }
    
    // Also set any draft-only data fields
    if (item.draft?.data) {
      Object.keys(item.draft.data).forEach(key => {
        if (!item.data || !(key in item.data)) {
          setValue(key, item.draft.data[key]);
        }
      });
    }
  }, [item, setValue]);

  const debouncedUpdate = useCallback(
    debounce((itemId: string, field: string, value: any) => {
      onFieldUpdate(itemId, field, value);
    }, 500),
    [onFieldUpdate]
  );

  useEffect(() => {
    const subscription = watch((value: any, { name, type }: any) => {
      if (type === 'change' && name && name !== 'status' && name !== 'publishedAt') {
        // Check if value has actually changed from default
        if (value[name] !== (defaultValues as any)?.[name]) {
          debouncedUpdate(item.id, name, value[name]);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, debouncedUpdate, defaultValues]);
  
  const handleBodyChange = (content: string) => {
    setValue('body', content);
    debouncedUpdate(item.id, 'body', content);
  };

  useEffect(() => {
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  // Helper function to handle direct field updates for the notion-like fields
  const handleDirectFieldUpdate = (fieldName: string, value: string) => {
    setValue(fieldName as any, value, { shouldDirty: true });
    debouncedUpdate(item.id, fieldName, value);
  };

  // Check if a field is a date field that should be read-only
  const isDateField = (fieldName: string, fieldType: string) => {
    const dateFieldNames = ['createdAt', 'updatedAt', 'publishedAt', 'datePublished', 'lastModified', 'created_at', 'updated_at', 'published_at', 'last_modified', 'date_modified', 'modified_at'];
    return fieldType === 'datetime' && dateFieldNames.includes(fieldName);
  };

  // Helper to build the display URL for the slug field
  const buildDisplayUrl = () => {
    const domain = currentSite?.domain || 'yoursite.com';
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Use the collection's urlPattern if available, otherwise fall back to /{collection.slug}
    const urlPattern = collection.urlPattern || `/${collection.slug}/{slug}`;
    
    // Replace {slug} placeholder with empty for display purposes  
    const pathPattern = urlPattern.replace('{slug}', '');
    
    return {
      domain: cleanDomain,
      path: pathPattern
    };
  };

  // Helper to get the effective OG title
  const getOgTitle = () => {
    if (inheritOgFromSeo) {
      return inheritSeoFromContent ? watch('title') : (watch('seoTitle') || watch('title'));
    }
    return watch('ogTitle') || watch('title');
  };

  // Helper to get the effective OG description
  const getOgDescription = () => {
    if (inheritOgFromSeo) {
      return inheritSeoFromContent ? (watch('body')?.substring(0, 200) || '') : (watch('seoDescription') || watch('body')?.substring(0, 200) || '');
    }
    return watch('ogDescription') || watch('body')?.substring(0, 200) || '';
  };

  // Helper to format dates nicely
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Extract key system info for display
  const publishedAtVal = watch('publishedAt') || (item as any).publishedAt || item.publishedAt;
  const isPublished = !!publishedAtVal;
  const publishedAtDisplay = formatDate(watch('datePublished') || publishedAtVal);
  const lastModifiedDisplay = formatDate(watch('dateLastModified') || watch('lastModified') || (item as any).dateLastModified || item.updatedAt);

  // Construct a public preview URL for the item
  const publicUrl = `https://${buildDisplayUrl().domain}${buildDisplayUrl().path}${watch('slug')}`;

  const getStructuredData = () => {
    const data: any = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
    };

    if (publicUrl) {
      data.mainEntityOfPage = {
        '@type': 'WebPage',
        '@id': publicUrl,
      };
    }
    
    const title = watch('title');
    if (title) data.headline = title;

    const description = watch('seoDescription') || watch('description') || (watch('body') ? watch('body').substring(0, 160) : '');
    if (description) data.description = description;

    const image = watch('ogImage');
    if (image) data.image = image;

    if (currentSite?.name) {
      const author = {
        '@type': 'Organization',
        name: currentSite.name,
      };
      data.author = author;
      data.publisher = author;
    }

    const datePublished = watch('datePublished') || watch('publishedAt') || (item as any).datePublished || item.publishedAt;
    if (datePublished) {
      data.datePublished = new Date(datePublished).toISOString();
    }

    const dateModified = watch('dateLastModified') || watch('lastModified') || (item as any).dateLastModified || item.updatedAt;
    if (dateModified) {
      data.dateModified = new Date(dateModified).toISOString();
    }
    
    return data;
  };
  const structuredData = getStructuredData();

  const openInNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(publicUrl, '_blank');
    }
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
        className={`fixed right-0 top-0 h-full w-full max-w-[820px] bg-white shadow-2xl z-50 transform transition-transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between max-h-[55px]">
            {/* Left-aligned control icons (Notion style) */}
            <div className="flex items-center gap-3">
              {/* Collapse / close (double chevron) */}
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <ChevronsRight className="w-5 h-5" />
              </button>

              {/* Open in new tab */}
              <button
                type="button"
                onClick={openInNewTab}
                className="text-gray-400 hover:text-gray-600"
              >
                <SquareArrowOutUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right-aligned status and actions */}
            <div className="flex items-center gap-3">
              {/* Pending edits indicator and republish button */}
              {isPublished && hasPendingChanges && onRepublish && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                    Pending edits
                  </span>
                  <button
                    onClick={() => onRepublish(item.id)}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Republish
                  </button>
                </div>
              )}
              
              <Tabs 
                value={isPublished ? 'published' : 'draft'} 
                onValueChange={async (newStatus) => {
                  if (newStatus === (isPublished ? 'published' : 'draft')) return; // no change

                  // Optimistically update local form state
                  const newPublishedAt = newStatus === 'published' ? new Date().toISOString() : null;
                  setValue('publishedAt', newPublishedAt, { shouldDirty: false });

                  // Call the shared toggle publish handler
                  try {
                    await onTogglePublish(item.id);
                  } catch (err) {
                    console.error('Toggle publish failed', err);
                    // Revert optimistic update
                    setValue('publishedAt', publishedAtVal, { shouldDirty: false });
                  }
                }}
                className="w-auto"
              >
                <TabsList className="grid w-full grid-cols-2 h-8 bg-gray-100">
                  <TabsTrigger value="draft" className="h-6 text-xs px-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    Draft
                  </TabsTrigger>
                  <TabsTrigger value="published" className="h-6 text-xs px-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Published
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto pt-6 px-15 pb-20">
            <div className="space-y-6">
              {/* Notion-like Title */}
              <div className="space-y-1 mb-6">

                <NotionLikeInput
                  value={watch('title') || ''}
                  onChange={(value) => handleDirectFieldUpdate('title', value)}
                  placeholder="Untitled"
                  className="text-2xl font-bold text-gray-900 placeholder-gray-400 border-none outline-none resize-none w-full bg-transparent leading-tight mb-2"
                  multiline={false}
                />
                
                {/* Description field if it exists */}
                {collection.fields.find(f => f.name === 'description') && (
                  <NotionLikeInput
                    value={watch('description') || ''}
                    onChange={(value) => handleDirectFieldUpdate('description', value)}
                    placeholder="Add a description..."
                    className="text-base text-gray-600 placeholder-gray-400 border-none outline-none resize-none w-full bg-transparent leading-relaxed"
                    multiline={true}
                  />
                )}
                {/* Slug field */}
                <div className="flex items-center text-sm mb-2 mt-0 border-b pb-6">
                  {/* <span className="text-gray-400">{buildDisplayUrl().domain}</span> */}
                  <span className="text-gray-400">{buildDisplayUrl().path}</span>
                  <NotionLikeInput
                    value={watch('slug') || ''}
                    onChange={(value) => {
                      // Validate and clean the slug input in real-time
                      const cleanedSlug = validateSlugInput(value);
                      handleDirectFieldUpdate('slug', cleanedSlug);
                    }}
                    onBlur={(value: string) => {
                      // On blur, create a fully valid slug
                      const finalSlug = createUrlSafeSlug(value);
                      if (finalSlug !== value) {
                        handleDirectFieldUpdate('slug', finalSlug);
                      }
                    }}
                    placeholder="url-slug"
                    className="text-sm text-foreground placeholder-gray-400 border-none outline-none bg-transparent flex-1 min-w-0"
                    multiline={false}
                  />
                </div>
              </div>

              {/* Custom Fields - Following collection field order */}
              <div className="space-y-6 pb-6">
                {localCollection.fields
                  .filter(field => !ALL_NON_CUSTOM_FIELDS.includes(field.name))
                  .map((field, index) => {
                    let type = field.type;
                    if (type === 'body') {
                      type = 'markdown';
                    }
                    const Icon = getFieldTypeIcon(type);
                    return (
                      <div key={`custom-${field.name}-${index}`}>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          {Icon && <Icon className="w-4 h-4 mr-2 text-gray-400" />}
                          {field.label}
                        </label>
                        {renderField(field, register, setValue, watch, authToken, onFieldUpdate, item.id)}
                      </div>
                    );
                  })}

                {/* Add Field link */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCollectionModalOpen(true)}
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 gap-1"
                  >
                    <TableProperties className="w-4 h-4" />
                    Edit Fields
                  </button>
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full border rounded-lg overflow-hidden">
                {/* SEO Settings */}
                <AccordionItem value="seo-settings">
                  <AccordionTrigger className="text-sm font-semibold p-5 h-[50px] items-center hover:no-underline hover:bg-gray-50 rounded-none">SEO Settings</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-6 pl-12 pr-6 pb-6">
                      {/* Inherit SEO checkbox */}
                      <label className="flex items-center gap-2 mb-4">
                        <input
                          type="checkbox"
                          checked={inheritSeoFromContent}
                          onChange={(e) => setInheritSeoFromContent(e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">Inherit title and description for SEO title and description</span>
                      </label>

                      {/* SEO Title - only show if not inheriting */}
                      {!inheritSeoFromContent && localCollection.fields
                        .filter(field => field.name === 'seoTitle')
                        .map((field, index) => (
                          <div key={`seo-title-${index}`}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.label || 'SEO Title'}
                            </label>
                            {renderField(field, register, setValue, watch, authToken, onFieldUpdate, item.id)}
                          </div>
                        ))}

                      {/* SEO Description - only show if not inheriting */}
                      {!inheritSeoFromContent && localCollection.fields
                        .filter(field => field.name === 'seoDescription')
                        .map((field, index) => (
                          <div key={`seo-description-${index}`}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.label || 'SEO Description'}
                            </label>
                            {renderField(field, register, setValue, watch, authToken, onFieldUpdate, item.id)}
                          </div>
                        ))}

                      {/* SEO Preview */}
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Google Search Preview</h4>
                        <GoogleSearchPreview
                          title={inheritSeoFromContent ? watch('title') : (watch('seoTitle') || watch('title'))}
                          description={inheritSeoFromContent ? (watch('body')?.substring(0, 200) || '') : (watch('seoDescription') || watch('body')?.substring(0, 200) || '')}
                          url={`${buildDisplayUrl().domain}${buildDisplayUrl().path}${watch('slug')}`}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Social/OG Settings */}
                <AccordionItem value="social-settings">
                  <AccordionTrigger className="text-sm font-semibold p-5 h-[50px] items-center hover:no-underline hover:bg-gray-50 rounded-none">Social/OG Settings</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-6 pl-12 pr-6 pb-6">
                      {/* Inherit OG checkbox */}
                      <label className="flex items-center gap-2 mb-4">
                        <input
                          type="checkbox"
                          checked={inheritOgFromSeo}
                          onChange={(e) => setInheritOgFromSeo(e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">Inherit SEO title and description</span>
                      </label>

                      {/* OG Title - only show if not inheriting */}
                      {!inheritOgFromSeo && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            OG Title
                          </label>
                          <input
                            {...register('ogTitle')}
                            placeholder="Open Graph title for social sharing"
                            className="text-sm w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      )}

                      {/* OG Description - only show if not inheriting */}
                      {!inheritOgFromSeo && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            OG Description
                          </label>
                          <textarea
                            {...register('ogDescription')}
                            rows={3}
                            placeholder="Open Graph description for social sharing"
                            className="text-sm w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      )}

                      {/* OG Image */}
                      {localCollection.fields
                        .filter(field => field.name === 'ogImage')
                        .map((field, index) => (
                          <div key={`og-image-${index}`}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.label || 'OG Image'}
                            </label>
                            {renderField(field, register, setValue, watch, authToken, onFieldUpdate, item.id)}
                          </div>
                        ))}

                      {/* Social Preview */}
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Social Preview</h4>
                        <SocialPreview
                          title={getOgTitle()}
                          description={getOgDescription()}
                          image={watch('ogImage')}
                          url={`${buildDisplayUrl().domain}${buildDisplayUrl().path}${watch('slug')}`}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Schema.org Settings */}
                <AccordionItem value="schema-settings">
                  <AccordionTrigger className="text-sm font-semibold p-5 h-[50px] items-center hover:no-underline hover:bg-gray-50 rounded-none">Schema.org Structured Data</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-6 pl-12 pr-6 pb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">JSON-LD Preview</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        This is a preview of the structured data that will be embedded in your page.
                      </p>
                      <StructuredDataPreview data={structuredData} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Publish & Last Modified Dates */}
              {(publishedAtDisplay || lastModifiedDisplay) && (
                <div className="flex items-center text-xs text-gray-500 gap-4 mt-6 border-t pt-4">
                  {publishedAtDisplay && <span>Published: {publishedAtDisplay}</span>}
                  {lastModifiedDisplay && <span>Last modified: {lastModifiedDisplay}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Collection Setup Modal */}
      {isCollectionModalOpen && (
        <CollectionSetupModal
          isOpen={isCollectionModalOpen}
          onClose={() => setIsCollectionModalOpen(false)}
          existingCollection={localCollection}
          onSave={async (data: Partial<CollectionConfig>) => {
            if (!currentSite) return;
            try {
              const resp = await fetch(`/api/admin/collections/${localCollection.slug}?siteId=${currentSite.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });
              if (resp.ok) {
                const updated: CollectionConfig = await resp.json();
                setLocalCollection(updated);

                // Ensure any new fields are registered in the form with empty value
                updated.fields.forEach(f => {
                  if (!(f.name in watch())) {
                    setValue(f.name as any, '', { shouldDirty: false });
                  }
                });

                setIsCollectionModalOpen(false);

                if (onCollectionUpdate) {
                  onCollectionUpdate(updated);
                }
              } else {
                console.error('Failed to save collection');
              }
            } catch(err) {
              console.error('Save collection error', err);
            }
          }}
        />
      )}
    </>
  );
}

// Notion-like input component
function NotionLikeInput({ 
  value, 
  onChange, 
  onBlur,
  placeholder, 
  className, 
  multiline = false 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  onBlur?: (value: string) => void;
  placeholder: string; 
  className: string; 
  multiline?: boolean; 
}) {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (onBlur) {
      onBlur(e.target.value);
    }
  };

  // Auto-resize for multiline inputs
  useEffect(() => {
    if (multiline && ref.current) {
      const textarea = ref.current as HTMLTextAreaElement;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [value, multiline]);

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        rows={1}
        style={{ overflow: 'hidden', backgroundColor: 'transparent' }}
      />
    );
  }

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type="text"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      style={{
        backgroundColor: 'transparent',
      }}
    />
  );
}

function renderField(field: any, register: any, setValue: any, watch: any, authToken: string, onFieldUpdate: (itemId: string, field: string, value: any) => void, itemId: string) {
  // Check if this is a date field that should be read-only
  const isReadOnlyDate = field.type === 'datetime' && SYSTEM_DATE_FIELDS.includes(field.name);

  switch (field.type) {
    case 'datetime':
      const date = watch(field.name) ? new Date(watch(field.name)) : undefined;
      
      if (isReadOnlyDate) {
        // Display read-only date
        return (
          <div className="text-sm px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
            {date ? date.toLocaleString() : 'Not set'}
          </div>
        );
      }
      
      return (
        <DatePicker
          date={date}
          setDate={(date) => {
            setValue(field.name, date ? date.toISOString() : null, { shouldDirty: true });
          }}
          disabled={() => false}
          withTime={true}
        />
      );
      
    case 'date':
      const d = watch(field.name) ? new Date(watch(field.name)) : undefined;
      return (
        <DatePicker
          date={d}
          setDate={(date) => {
            setValue(field.name, date ? date.toISOString() : null, { shouldDirty: true });
          }}
          disabled={() => false}
        />
      );
      
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
        <NotionSelect
          options={field.options || []}
          value={watch(field.name) || null}
          onChange={(value) => {
            setValue(field.name, value, { shouldDirty: true });
            onFieldUpdate(itemId, field.name, value);
          }}
          placeholder={field.placeholder || "Select an option..."}
          className="w-full"
        />
      );
      
    case 'multiselect':
      return (
        <NotionMultiSelect
          options={field.options || []}
          value={watch(field.name) || []}
          onChange={(value) => {
            setValue(field.name, value, { shouldDirty: true });
            onFieldUpdate(itemId, field.name, value);
          }}
          placeholder={field.placeholder || "Select options..."}
          className="w-full"
        />
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
      
    case 'markdown':
    case 'body':
      return (
        <TipTapEditor
          content={watch(field.name)}
          onChange={(content) => {
            setValue(field.name, content, { shouldDirty: true });
            // Use debounced update like other fields
            setTimeout(() => onFieldUpdate(itemId, field.name, content), 500);
          }}
          authToken={authToken}
        />
      );
      
    case 'number':
      return (
        <input
          type="number"
          {...register(field.name, { valueAsNumber: true })}
          className="text-sm w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          onBlur={(e) => {
            const numVal = Number(e.target.value);
            if (!isNaN(numVal)) {
              onFieldUpdate(itemId, field.name, numVal);
            }
          }}
        />
      );
      
    case 'reference':
    case 'multi-reference': {
      const isMulti = field.type === 'multi-reference';
      return (
        <ReferenceFieldInput
          field={field}
          value={watch(field.name)}
          isMulti={isMulti}
          onValueChange={(val) => {
            setValue(field.name, val, { shouldDirty: true });
            onFieldUpdate(itemId, field.name, val);
          }}
        />
      );
    }
    
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

// Simple Google Search Preview Component
function GoogleSearchPreview({ title, description, url }: { title: string; description: string; url: string }) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>{url}</span>
        </div>
        <h3 className="text-blue-600 text-lg hover:underline cursor-pointer leading-tight">
          {title || 'Untitled'}
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          {description || 'No description available'}
        </p>
      </div>
    </div>
  );
}

// Simple Social/OG Preview Component
function SocialPreview({ title, description, image, url }: { title: string; description: string; image?: string; url: string }) {
  return (
    <div className="border rounded-lg p-4 bg-white max-w-md">
      {image && (
        <div className="mb-3">
          <img src={image} alt="OG Preview" className="w-full h-32 object-cover rounded" />
        </div>
      )}
      <div className="space-y-1">
        <div className="text-xs text-gray-500 uppercase tracking-wide">
          {url.replace(/^https?:\/\//, '')}
        </div>
        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
          {title || 'Untitled'}
        </h3>
        <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
          {description || 'No description available'}
        </p>
      </div>
    </div>
  );
}

function StructuredDataPreview({ data }: { data: object }) {
  return (
    <div className="border rounded-lg p-4 bg-gray-50 text-xs font-mono">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all">
        <code>
          {JSON.stringify(data, null, 2)}
        </code>
      </pre>
    </div>
  );
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

// Helper component for reference fields to comply with React hooks rules
function ReferenceFieldInput({
  field,
  value,
  isMulti,
  onValueChange,
}: {
  field: any;
  value: any;
  isMulti: boolean;
  onValueChange: (val: any) => void;
}) {
  const [options, setOptions] = useState<any[]>(field.options || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (field.referenceCollection) {
      const fetchOptions = async () => {
        try {
          setLoading(true);
          const res = await fetch(`/api/admin/content/${field.referenceCollection}?limit=100`);
          if (!res.ok) return;
          const json = await res.json();
          if (Array.isArray(json?.items)) {
            const opts = json.items.map((item: any) => ({ label: item.title || item.slug || item.id, value: item.id }));
            setOptions(opts);
          }
        } catch (err) {
          console.error('Failed to fetch reference options', err);
        } finally {
          setLoading(false);
        }
      };
      fetchOptions();
    }
  }, [field.referenceCollection]);

  if (isMulti) {
    return (
      <NotionMultiSelect
        options={options}
        value={value || []}
        onChange={onValueChange}
        placeholder={loading ? 'Loading...' : (field.placeholder || 'Select options...')}
        disabled={loading}
        className="w-full"
      />
    );
  }

  return (
    <NotionSelect
      options={options}
      value={value || null}
      onChange={onValueChange}
      placeholder={loading ? 'Loading...' : (field.placeholder || 'Select an option...')}
      disabled={loading}
      className="w-full"
    />
  );
}

 