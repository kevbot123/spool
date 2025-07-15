# Spool CMS MCP Server Plan

## Overview

The MCP server will provide developers with direct access to their Spool CMS from their code editor, enabling content management, collection management, and site operations without leaving their development environment.

## Core Design Principles

- **Minimal Tool Count**: Consolidate functionality to reduce cognitive load for AI models
- **Intuitive Parameters**: Use clear, descriptive parameters that AI can understand
- **Consistent Patterns**: Follow consistent naming and parameter conventions
- **Error Resilience**: Provide clear error messages and validation

## Consolidated Tool Set (8 Tools Total)

### 1. Site Management (2 Tools)

#### `list_sites`
Lists all sites for the authenticated user.
```typescript
list_sites(): Promise<Site[]>
```

#### `manage_site`
Get site details, update settings, or regenerate API keys.
```typescript
manage_site(
  siteId: string,
  action: 'get' | 'update' | 'regenerate_key',
  data?: Partial<SiteSettings>
): Promise<Site | { apiKey: string }>
```

### 2. Collection Management (2 Tools)

#### `list_collections`
Lists all collections for a specific site.
```typescript
list_collections(siteId: string): Promise<Collection[]>
```

#### `manage_collection`
Create, read, update, or delete collections.
```typescript
manage_collection(
  siteId: string,
  action: 'create' | 'get' | 'update' | 'delete',
  collectionSlug?: string,
  data?: Partial<CollectionConfig>
): Promise<Collection | void>
```

### 3. Content Management (4 Tools)

#### `list_content`
Lists content items in a collection with filtering and pagination.
```typescript
list_content(
  siteId: string,
  collectionSlug: string,
  options?: {
    status?: 'draft' | 'published' | 'all';
    limit?: number;
    offset?: number;
    search?: string;
  }
): Promise<ContentListResponse>
```

#### `get_content`
Retrieves a specific content item by slug, including collection schema for context.
```typescript
get_content(
  siteId: string,
  collectionSlug: string,
  slug: string,
  options?: { renderHtml?: boolean; includeSchema?: boolean }
): Promise<ContentItem & { schema?: CollectionConfig }>
```

#### `create_content`
Creates a new content item. Returns the created item with collection schema for reference.
```typescript
create_content(
  siteId: string,
  collectionSlug: string,
  data: {
    slug: string;
    title: string;
    body?: string;
    status?: 'draft' | 'published';
    [key: string]: any;
  }
): Promise<ContentItem & { schema: CollectionConfig }>
```

#### `update_content`
Updates existing content item (includes publishing/unpublishing). Returns updated item with collection schema.
```typescript
update_content(
  siteId: string,
  collectionSlug: string,
  slug: string,
  data: {
    title?: string;
    body?: string;
    status?: 'draft' | 'published';
    [key: string]: any;
  }
): Promise<ContentItem & { schema: CollectionConfig }>
```

## Technical Architecture

```
packages/mcp-server/
├── package.json
├── README.md
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # MCP server implementation
│   ├── tools/
│   │   ├── sites.ts          # Site management tools
│   │   ├── collections.ts    # Collection management tools
│   │   ├── content.ts        # Content management tools
│   │   └── index.ts          # Tool registry
│   ├── types/
│   │   ├── mcp.ts            # MCP-specific types
│   │   └── api.ts            # API response types
│   ├── utils/
│   │   ├── api-client.ts     # HTTP client for Spool API
│   │   ├── auth.ts           # Authentication handling
│   │   └── validation.ts     # Input validation
│   └── config.ts             # Configuration management
├── dist/                     # Compiled output
└── tsconfig.json
```

## API Integration

The MCP server will use existing Spool API endpoints:

- **Sites**: `/api/sites/setup`, `/api/admin/sites/[siteId]/settings`
- **Collections**: `/api/admin/collections`, `/api/spool/[siteId]/collections`
- **Content**: `/api/admin/content/[collection]`, `/api/spool/[siteId]/content/[collection]`

## Authentication Strategy

1. **API Key**: Required for all operations, stored securely
2. **Site-specific**: Each site has its own API key
3. **Configuration**: Store in `~/.spool/config.json` or environment variables

```json
{
  "apiUrl": "https://app.spool.dev",
  "sites": {
    "site-id-1": {
      "name": "My Blog",
      "apiKey": "spool_xxxxx"
    }
  }
}
```

## Tool Consolidation Benefits

### Before (16 tools):
- `list_sites`, `get_site`, `update_site_settings`, `regenerate_api_key`
- `list_collections`, `get_collection_schema`, `create_collection`, `update_collection`, `delete_collection`
- `list_content`, `get_content_item`, `create_content_item`, `update_content_item`, `delete_content_item`, `publish_content_item`, `search_content`

### After (8 tools):
- `list_sites`, `manage_site`
- `list_collections`, `manage_collection`
- `list_content`, `get_content`, `create_content`, `update_content`

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Set up package structure
- [ ] Implement MCP server boilerplate
- [ ] Create API client with authentication
- [ ] Add configuration management

### Phase 2: Site Management (Week 2)
- [ ] Implement `list_sites` tool
- [ ] Implement `manage_site` tool
- [ ] Add error handling and validation
- [ ] Write tests

### Phase 3: Collection Management (Week 3)
- [ ] Implement `list_collections` tool
- [ ] Implement `manage_collection` tool
- [ ] Add schema validation
- [ ] Write tests

### Phase 4: Content Management (Week 4)
- [ ] Implement `list_content` tool
- [ ] Implement `get_content` tool
- [ ] Implement `create_content` tool
- [ ] Implement `update_content` tool
- [ ] Add content validation
- [ ] Write tests

### Phase 5: Polish & Documentation (Week 5)
- [ ] Comprehensive documentation
- [ ] Usage examples
- [ ] CLI setup wizard
- [ ] Performance optimization

## Schema-Aware AI Workflow

### How AI Discovers Collection Structure

1. **Schema Discovery**: When AI needs to work with content, it first calls `list_collections` to see available collections
2. **Field Inspection**: AI calls `manage_collection` with action 'get' to understand the field structure
3. **Content Operations**: AI uses the schema information to properly structure create/update operations

### Schema Information Provided

Each collection schema includes:
- **Field definitions**: name, type, required status, validation rules
- **Field types**: text, markdown, number, boolean, date, select, reference, etc.
- **Validation rules**: min/max values, required fields, allowed options
- **Default values**: Pre-populated field values

## Example Usage Patterns

### Creating a Blog Post (Schema-Aware)
```typescript
// 1. List sites to find the right one
const sites = await list_sites();
const blogSite = sites.find(s => s.name === 'My Blog');

// 2. Check collections and get schema
const collections = await list_collections(blogSite.id);
const blogCollection = collections.find(c => c.slug === 'blog');

// 3. Get detailed schema to understand required fields
const schema = await manage_collection(blogSite.id, 'get', 'blog');
console.log('Available fields:', schema.fields);
// Output: [
//   { name: 'title', type: 'text', required: true },
//   { name: 'body', type: 'markdown', required: true },
//   { name: 'excerpt', type: 'text', required: false },
//   { name: 'featured', type: 'boolean', default: false },
//   { name: 'category', type: 'select', options: ['Tech', 'Design', 'Business'] },
//   { name: 'publishDate', type: 'date', required: false }
// ]

// 4. Create new blog post with schema-compliant data
const newPost = await create_content(blogSite.id, 'blog', {
  slug: 'my-new-post',
  title: 'My New Blog Post',
  body: '# Hello World\n\nThis is my new blog post...',
  excerpt: 'A brief introduction to my new post',
  featured: true,
  category: 'Tech',
  publishDate: '2024-01-15',
  status: 'draft'
});

// 5. Update with validation (AI knows what fields are available)
await update_content(blogSite.id, 'blog', 'my-new-post', {
  category: 'Design', // AI knows this is a valid option
  featured: false,     // AI knows this is a boolean field
  status: 'published'
});
```

### Managing Collections with Schema Validation
```typescript
// Create a new collection with detailed field definitions
const newCollection = await manage_collection(siteId, 'create', undefined, {
  name: 'Products',
  slug: 'products',
  description: 'Product catalog',
  fields: [
    { 
      name: 'price', 
      label: 'Price', 
      type: 'number', 
      required: true,
      validation: { min: 0 }
    },
    { 
      name: 'description', 
      label: 'Description', 
      type: 'text',
      required: true,
      placeholder: 'Enter product description...'
    },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      required: true,
      options: ['Electronics', 'Clothing', 'Books']
    },
    {
      name: 'inStock',
      label: 'In Stock',
      type: 'boolean',
      default: true
    }
  ]
});

// AI can now create products with proper validation
const product = await create_content(siteId, 'products', {
  slug: 'laptop-pro',
  title: 'Laptop Pro',
  price: 1299.99,           // AI knows this must be a number >= 0
  description: 'High-performance laptop for professionals',
  category: 'Electronics',  // AI knows valid options
  inStock: true,           // AI knows this is boolean
  status: 'published'
});
```

## Schema-Aware Validation and Error Handling

### Validation Process
1. **Schema Validation**: All content operations validate against collection schema
2. **Field Type Validation**: Ensures data types match field definitions
3. **Required Field Validation**: Checks all required fields are present
4. **Option Validation**: For select fields, validates values are in allowed options

### Error Responses
All tools will return consistent error responses with schema context:

```typescript
interface MCPError {
  code: string;
  message: string;
  details?: Record<string, any>;
  schema?: CollectionConfig; // Included for validation errors
}
```

Common error codes:
- `SITE_NOT_FOUND`: Site doesn't exist or no access
- `COLLECTION_NOT_FOUND`: Collection doesn't exist
- `CONTENT_NOT_FOUND`: Content item doesn't exist
- `VALIDATION_ERROR`: Invalid input data (includes schema for reference)
- `REQUIRED_FIELD_MISSING`: Required field not provided
- `INVALID_FIELD_TYPE`: Field value doesn't match expected type
- `INVALID_OPTION`: Select field value not in allowed options
- `AUTH_ERROR`: Authentication failed
- `RATE_LIMIT`: API rate limit exceeded

### Example Validation Error
```typescript
{
  code: 'VALIDATION_ERROR',
  message: 'Invalid field values provided',
  details: {
    errors: [
      { field: 'price', message: 'Must be a number greater than 0' },
      { field: 'category', message: 'Must be one of: Electronics, Clothing, Books' }
    ]
  },
  schema: {
    fields: [
      { name: 'price', type: 'number', validation: { min: 0 } },
      { name: 'category', type: 'select', options: ['Electronics', 'Clothing', 'Books'] }
    ]
  }
}
```

## Success Metrics

- **Adoption**: Number of developers using the MCP server
- **Usage**: Frequency of tool calls and operations
- **Performance**: Response times and error rates
- **Feedback**: Developer satisfaction and feature requests

This streamlined approach reduces complexity while maintaining full functionality, making it much more suitable for AI model consumption and developer productivity. 