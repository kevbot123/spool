'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ContentItem, CollectionConfig } from '@/types/cms';
import TipTapEditor from './TipTapEditor';
import { SEOPreview } from './SEOPreview';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { DatePicker } from '@/components/ui/date-picker';
import { useSite } from '@/context/SiteContext';
import { ChevronsRight, ExternalLink, Link2, SquareArrowOutUpRight, TableProperties, TextCursorInput, MoreVertical, RefreshCcw, X, Trash2 } from 'lucide-react';
import CollectionSetupModal from '@/components/admin/CollectionSetupModal';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { getFieldTypeIcon } from '@/lib/field-type-icons';
import { validateSlugInput, createUrlSafeSlug } from '@/lib/utils';
import { NotionSelect, NotionMultiSelect } from '@/components/ui/notion-select';
import { getStatusColor } from '@/lib/status-colors';

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
  onDelete?: (itemId: string) => Promise<void> | void; // Add delete handler
  onClearPending?: (itemId: string) => Promise<void> | void; // Clear pending edits handler
}

export function DetailPanel({
  item,
  collection,
  onClose,
  onFieldUpdate,
  onTogglePublish: _onTogglePublish,
  authToken, // Added authToken prop
  hasPendingChanges = false,
  onRepublish,
  onCollectionUpdate,
  onDelete,
  onClearPending,
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

  // Helper function to get field values with draft data preferred
  const getFieldValue = useCallback((fieldName: string) => {
    // Handle top-level fields
    if (['title', 'slug', 'seoTitle', 'seoDescription', 'ogImage'].includes(fieldName)) {
      const draftValue = (item.draft as any)?.[fieldName];
      const liveValue = (item as any)[fieldName];
      return draftValue !== undefined ? draftValue : (liveValue || '');
    }

    // Handle status
    if (fieldName === 'status') {
      const draftStatus = (item.draft as any)?.status;
      const liveStatus = (item as any).status || (item.data as any)?.status;
      return draftStatus !== undefined ? draftStatus : (liveStatus || (item.publishedAt ? 'published' : 'draft'));
    }

    // Handle data fields
    const draftValue = item.draft?.data?.[fieldName];
    const liveValue = item.data?.[fieldName];
    return draftValue !== undefined ? draftValue : liveValue;
  }, [item]);
  
  useEffect(() => {
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  // Helper function to handle direct field updates for the notion-like fields
  const handleDirectFieldUpdate = (fieldName: string, value: string) => {
    onFieldUpdate(item.id, fieldName, value);
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
      return inheritSeoFromContent ? getFieldValue('title') : (getFieldValue('seoTitle') || getFieldValue('title'));
    }
    return getFieldValue('ogTitle') || getFieldValue('title');
  };

  // Helper to get the effective OG description
  const getOgDescription = () => {
    if (inheritOgFromSeo) {
      return inheritSeoFromContent ? (getFieldValue('body')?.substring(0, 200) || '') : (getFieldValue('seoDescription') || getFieldValue('body')?.substring(0, 200) || '');
    }
    return getFieldValue('ogDescription') || getFieldValue('body')?.substring(0, 200) || '';
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
  const statusVal = getFieldValue('status') as 'draft' | 'published' | undefined;
  const isPublished = statusVal === 'published';
  const publishedAtVal = getFieldValue('publishedAt') || (item as any).publishedAt || item.publishedAt;
  const publishedAtDisplay = formatDate(getFieldValue('datePublished') || publishedAtVal);
  const lastModifiedDisplay = formatDate(getFieldValue('dateLastModified') || getFieldValue('lastModified') || (item as any).dateLastModified || item.updatedAt);

  // Construct a public preview URL for the item
  const publicUrl = `https://${buildDisplayUrl().domain}${buildDisplayUrl().path}${getFieldValue('slug')}`;

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
    
    const title = getFieldValue('title');
    if (title) data.headline = title;

    const description = getFieldValue('seoDescription') || getFieldValue('description') || (getFieldValue('body') ? getFieldValue('body').substring(0, 160) : '');
    if (description) data.description = description;

    const image = getFieldValue('ogImage');
    if (image) data.image = image;

    if (currentSite?.name) {
      const author = {
        '@type': 'Organization',
        name: currentSite.name,
      };
      data.author = author;
      data.publisher = author;
    }

    const datePublished = getFieldValue('datePublished') || getFieldValue('publishedAt') || (item as any).datePublished || item.publishedAt;
    if (datePublished) {
      data.datePublished = new Date(datePublished).toISOString();
    }

    const dateModified = getFieldValue('dateLastModified') || getFieldValue('lastModified') || (item as any).dateLastModified || item.updatedAt;
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
        className={`fixed right-0 top-0 h-full w-full max-w-[820px] bg-white shadow-2xl z-50 m-[8px] rounded-t-xl outline-1 outline-gray-900/5 transform transition-transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between max-h-[60px]">
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
            <div className="flex items-center gap-2">
              {/* Pending edits indicator and republish button */}
              {isPublished && hasPendingChanges && onRepublish && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-medium bg-blue-50 text-blue-700">
                    Pending edits
                  </Badge>
                  <Button size="sm" onClick={() => onRepublish(item.id)} className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 py-0">
                    Republish
                  </Button>
                </div>
              )}
              
              {hasPendingChanges && onClearPending ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onClearPending(item.id)}
                  className="h-8 px-3 py-0"
                >
                  Clear
                </Button>
              ) : (
                (() => {
                  const explicitStatus = getFieldValue('status');
                  const effectiveStatus: 'draft' | 'published' = (explicitStatus as any) || (isPublished ? 'published' : 'draft');

                  return (
                    <Select
                      value={effectiveStatus}
                      onValueChange={async (newStatus) => {
                        const currentStatus = effectiveStatus;
                        if (newStatus === currentStatus) return;

                        try {
                          await _onTogglePublish(item.id);
                        } catch (err) {
                          console.error('Toggle publish failed', err);
                        }
                      }}
                    >
                      <SelectTrigger size="sm" className="capitalize">
                        <SelectValue>
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getStatusColor(effectiveStatus as any)}`} />
                            {effectiveStatus}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getStatusColor('draft')}`} />
                            Draft
                          </span>
                        </SelectItem>
                        <SelectItem value="published">
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getStatusColor('published')}`} />
                            Published
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  );
                })()
              )}

              {/* More actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200/80 rounded-md"
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
                          onClick={() => onRepublish(item.id)}
                          className="flex items-center w-full px-4 py-1 text-sm cursor-pointer hover:bg-blue-50"
                        >
                          <RefreshCcw size={14} className="mr-2" />
                          <span>Republish edits</span>
                        </DropdownMenuItem>
                      )}
                      {onClearPending && (
                        <DropdownMenuItem
                          onClick={() => onClearPending(item.id)}
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
                      href={publicUrl}
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
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this item?')) {
                          onDelete(item.id);
                        }
                      }}
                      className="flex items-center w-full px-4 py-1 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 size={14} className="mr-2" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto pt-6 px-14 pb-20 detailbody">
            <div className="space-y-6">
              {/* Core Fields: Title (Notion style), Description, Slug */}
              <div className="space-y-6 mb-8">
                {/* Title - Notion-like */}
                <NotionLikeInput
                  value={getFieldValue('title') || ''}
                  onChange={(value) => handleDirectFieldUpdate('title', value)}
                  placeholder="Untitled"
                  className="text-[24px] font-semibold px-3 py-2 text-gray-900 placeholder-gray-400 border border-transparent hover:border-gray-200 hover:shadow-sm focus:shadow-sm focus:border-gray-200 rounded-md outline-none resize-none w-full bg-transparent leading-tight mb-2 cursor-text transition-colors"
                  multiline={false}
                />

                {/* Description */}
                {collection.fields.find(f => f.name === 'description') && (
                  <div className="md:flex md:items-start md:gap-6 pt-8">
                    <label className="flex items-center text-[13px] font-medium text-gray-700 mb-2 md:mb-0 md:w-38 gap-2">
                      <TextCursorInput className="w-4 h-4 text-gray-400 shrink-0" />
                      Description
                    </label>
                    <div className="flex-1">
                      <textarea
                        value={getFieldValue('description') || ''}
                        onChange={(e) => handleDirectFieldUpdate('description', e.target.value)}
                        rows={2}
                        placeholder="Add a description..."
                        className="text-sm w-full px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}

                {/* Slug */}
                <div className="md:flex md:items-start md:gap-6">
                  <label className="flex items-center text-[13px] font-medium text-gray-700 mb-2 md:mb-0 md:w-38 gap-2">
                    <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
                    Slug
                  </label>
                  <div className="flex-1 flex items-center gap-1">
                    <span className="text-gray-400 text-sm">{buildDisplayUrl().path}</span>
                    <input
                      value={getFieldValue('slug') || ''}
                      onChange={(e) => {
                        const cleaned = validateSlugInput(e.target.value);
                        handleDirectFieldUpdate('slug', cleaned);
                      }}
                      onBlur={(e) => {
                        const finalSlug = createUrlSafeSlug(e.target.value);
                        if (finalSlug !== e.target.value) {
                          handleDirectFieldUpdate('slug', finalSlug);
                        }
                      }}
                      placeholder="url-slug"
                      className="text-sm flex-1 min-w-0 px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Fields - Following collection field order */}
              <div className="space-y-8 pb-6">
                {localCollection.fields
                  .filter(field => !ALL_NON_CUSTOM_FIELDS.includes(field.name))
                  .map((field, index) => {
                    const Icon = getFieldTypeIcon(field.type);
                    return (
                      <div
                        key={`custom-${field.name}-${index}`}
                        className="md:flex md:items-start md:gap-6"
                      >
                        {/* Label (left column) */}
                        <label
                          className="flex items-center text-[13px] font-medium text-gray-700 mb-2 md:mb-0 md:w-38 gap-2"
                        >
                          {Icon && (
                            <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                          <span className="truncate block">
                            {field.label}
                          </span>
                        </label>

                        {/* Field input (right column) */}
                        <div className="flex-1">
                          {renderField(
                            field,
                            authToken,
                            onFieldUpdate,
                            item.id,
                            getFieldValue
                          )}
                        </div>
                      </div>
                    );
                  })}

                {/* Add Field link */}
                <div className="text-right">
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
                            {renderField(field, authToken, onFieldUpdate, item.id, getFieldValue)}
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
                            {renderField(field, authToken, onFieldUpdate, item.id, getFieldValue)}
                          </div>
                        ))}

                      {/* SEO Preview */}
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Google Search Preview</h4>
                        <GoogleSearchPreview
                          title={inheritSeoFromContent ? getFieldValue('title') : (getFieldValue('seoTitle') || getFieldValue('title'))}
                          description={inheritSeoFromContent ? (getFieldValue('body')?.substring(0, 200) || '') : (getFieldValue('seoDescription') || getFieldValue('body')?.substring(0, 200) || '')}
                          url={`${buildDisplayUrl().domain}${buildDisplayUrl().path}${getFieldValue('slug')}`}
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
                      {!inheritOgFromSeo && localCollection.fields
                        .filter(field => field.name === 'ogTitle')
                        .map((field, index) => (
                          <div key={`og-title-${index}`}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.label || 'OG Title'}
                            </label>
                            {renderField(field, authToken, onFieldUpdate, item.id, getFieldValue)}
                          </div>
                        ))}

                      {/* OG Description - only show if not inheriting */}
                      {!inheritOgFromSeo && localCollection.fields
                        .filter(field => field.name === 'ogDescription')
                        .map((field, index) => (
                          <div key={`og-description-${index}`}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.label || 'OG Description'}
                            </label>
                            {renderField(field, authToken, onFieldUpdate, item.id, getFieldValue)}
                          </div>
                        ))}

                      {/* OG Image */}
                      {localCollection.fields
                        .filter(field => field.name === 'ogImage')
                        .map((field, index) => (
                          <div key={`og-image-${index}`}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.label || 'OG Image'}
                            </label>
                            {renderField(field, authToken, onFieldUpdate, item.id, getFieldValue)}
                          </div>
                        ))}

                      {/* Social Preview */}
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Social Media Preview</h4>
                        <SocialPreview
                          title={getOgTitle()}
                          description={getOgDescription()}
                          image={getFieldValue('ogImage')}
                          url={`${buildDisplayUrl().domain}${buildDisplayUrl().path}${getFieldValue('slug')}`}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* System Information */}
                <AccordionItem value="system-info">
                  <AccordionTrigger className="text-sm font-semibold p-5 h-[50px] items-center hover:no-underline hover:bg-gray-50 rounded-none">System Information</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-6 pl-12 pr-6 pb-6">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="block text-gray-600">Status</label>
                          <span className="text-gray-900 capitalize">{isPublished ? 'Published' : 'Draft'}</span>
                        </div>
                        
                        {publishedAtDisplay && (
                          <div>
                            <label className="block text-gray-600">Published</label>
                            <span className="text-gray-900">{publishedAtDisplay}</span>
                          </div>
                        )}
                        
                        {lastModifiedDisplay && (
                          <div>
                            <label className="block text-gray-600">Last Modified</label>
                            <span className="text-gray-900">{lastModifiedDisplay}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Structured Data */}
                <AccordionItem value="structured-data">
                  <AccordionTrigger className="text-sm font-semibold p-5 h-[50px] items-center hover:no-underline hover:bg-gray-50 rounded-none">Structured Data</AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-6 pl-12 pr-6 pb-6">
                      <StructuredDataPreview data={structuredData} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
          onSave={async (updatedCollection) => {
            setLocalCollection(updatedCollection as CollectionConfig);
            onCollectionUpdate?.(updatedCollection as CollectionConfig);
            setIsCollectionModalOpen(false);
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
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    onBlur?.(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
  };

  if (multiline) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        rows={1}
        style={{ resize: 'none' }}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
    />
  );
}

function renderField(
  field: any,
  authToken: string,
  onFieldUpdate: (itemId: string, field: string, value: any) => void,
  itemId: string,
  getFieldValue: (fieldName: string) => any
) {
  const value = getFieldValue(field.name);
  
  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onFieldUpdate(itemId, field.name, e.target.value)}
          placeholder={field.placeholder}
          className="text-sm w-full px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      );
    
    case 'textarea':
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onFieldUpdate(itemId, field.name, e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="text-sm w-full px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      );
    
    case 'number':
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onFieldUpdate(itemId, field.name, Number(e.target.value))}
          placeholder={field.placeholder}
          className="text-sm w-full px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      );
    
    case 'boolean':
      return (
        <input
          type="checkbox"
          checked={value || false}
          onChange={(e) => onFieldUpdate(itemId, field.name, e.target.checked)}
          className="rounded border-gray-300 text-primary focus:ring-primary"
        />
      );
    
         case 'datetime':
       return (
         <DatePicker
           date={value ? new Date(value) : undefined}
           setDate={(date: Date | undefined) => onFieldUpdate(itemId, field.name, date?.toISOString())}
           className="w-full"
         />
       );
    
    case 'select':
      return (
        <Select
          value={value || ''}
          onValueChange={(newValue) => onFieldUpdate(itemId, field.name, newValue)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option: any, idx: number) => (
              <SelectItem key={`${option.value}-${idx}`} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    
    case 'multi-select':
      return (
        <NotionMultiSelect
          value={value || []}
          onChange={(newValue) => onFieldUpdate(itemId, field.name, newValue)}
          options={field.options || []}
          placeholder={field.placeholder}
        />
      );
    
    case 'reference':
      // Reference fields would need additional logic for fetching options
      return (
        <NotionSelect
          value={value || ''}
          onChange={(newValue) => onFieldUpdate(itemId, field.name, newValue)}
          options={[]} // Would need to fetch reference options
          placeholder={field.placeholder}
        />
      );
    
    case 'image':
      return (
        <ImageUploadField
          field={field}
          value={value || ''}
          authToken={authToken}
          onFieldUpdate={(fieldName, value) => onFieldUpdate(itemId, fieldName, value)}
        />
      );
    
         case 'markdown':
       return (
         <TipTapEditor
           content={value || ''}
           onChange={(newValue) => onFieldUpdate(itemId, field.name, newValue)}
           authToken={authToken}
         />
       );
    
    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onFieldUpdate(itemId, field.name, e.target.value)}
          placeholder={field.placeholder}
          className="text-sm w-full px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      );
  }
}

function GoogleSearchPreview({ title, description, url }: { title: string; description: string; url: string }) {
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="text-xs text-gray-600 mb-1">{url}</div>
      <div className="text-lg text-blue-600 font-medium mb-1">{title}</div>
      <div className="text-sm text-gray-700">{description}</div>
    </div>
  );
}

function SocialPreview({ title, description, image, url }: { title: string; description: string; image?: string; url: string }) {
  return (
    <div className="border rounded-lg overflow-hidden bg-gray-50">
      {image && (
        <div className="aspect-[1.91/1] bg-gray-200 flex items-center justify-center">
          <img src={image} alt="" className="max-w-full max-h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="text-xs text-gray-600 mb-1">{url}</div>
        <div className="font-medium text-gray-900 mb-1">{title}</div>
        <div className="text-sm text-gray-700">{description}</div>
      </div>
    </div>
  );
}

function StructuredDataPreview({ data }: { data: object }) {
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function ImageUploadField({ field, value, authToken, onFieldUpdate }: { field: any, value: string, authToken: string, onFieldUpdate: (field: string, value: any) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      onFieldUpdate(field.name, result.url);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      
      {value && (
        <div className="relative">
          <img
            src={value}
            alt="Uploaded image"
            className="max-w-full h-32 object-cover rounded-md"
          />
          <button
            onClick={() => onFieldUpdate(field.name, '')}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 text-xs"
          >
            ×
          </button>
        </div>
      )}
      
      <button
        onClick={triggerFileInput}
        className="text-sm px-3 py-1 border rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {value ? 'Replace Image' : 'Upload Image'}
      </button>
    </div>
  );
}

 