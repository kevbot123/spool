import { FieldConfig } from '@/types/cms';

// Central definition of the system-default fields that every collection gets
// (except `status`, which is reserved for internal publish workflow control).
// Any UI that needs to reference the built-in fields should import this file
// so that changes remain DRY and consistent across the app.

export const DEFAULT_FIELDS: FieldConfig[] = [
  {
    name: 'title',
    label: 'Title',
    type: 'text',
    required: true,
    placeholder: 'Enter title...'
  },
  {
    name: 'description',
    label: 'Description',
    type: 'text',
    required: false,
    placeholder: 'Brief description...'
  },
  {
    name: 'slug',
    label: 'URL Slug',
    type: 'text',
    required: true,
    placeholder: 'url-slug'
  },
  {
    name: 'seoTitle',
    label: 'SEO Title',
    type: 'text',
    required: false,
    placeholder: 'Falls back to Title if empty',
    description: 'Custom title for search engines (falls back to Title if empty)'
  },
  {
    name: 'seoDescription',
    label: 'SEO Description',
    type: 'text',
    required: false,
    placeholder: 'Falls back to Description if empty',
    description: 'Meta description for search engines (falls back to Description if empty)',
    validation: {
      max: 160
    }
  },
  {
    name: 'ogTitle',
    label: 'OG Title',
    type: 'text',
    required: false,
    placeholder: 'Falls back to SEO Title or Title if empty',
    description: 'Open Graph title for social media (falls back to SEO Title, then Title if empty)'
  },
  {
    name: 'ogDescription',
    label: 'OG Description',
    type: 'text',
    required: false,
    placeholder: 'Falls back to SEO Description or Description if empty',
    description: 'Open Graph description for social media (falls back to SEO Description, then Description if empty)',
    validation: {
      max: 200
    }
  },
  {
    name: 'ogImage',
    label: 'OG Image',
    type: 'image',
    required: false,
    description: 'Social media preview image'
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: ['draft', 'published'],
    default: 'draft',
    required: true,
    description: 'Content publication status'
  },
  {
    name: 'dateLastModified',
    label: 'Date Last Modified',
    type: 'datetime',
    required: false,
    description: 'Automatically updated when content is modified',
    meta: {
      automatic: true,
      readonly: true
    }
  },
  {
    name: 'datePublished',
    label: 'Date Published',
    type: 'datetime',
    required: false,
    description: 'Automatically set when content is first published',
    meta: {
      automatic: true,
      readonly: true
    }
  }
];
