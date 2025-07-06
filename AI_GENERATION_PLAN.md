# AI Collection Item Generation - Implementation Plan

## Overview
This document outlines the implementation plan for adding AI-powered collection item generation to the Spool CMS. The feature will allow users to generate new collection items using AI models (OpenAI, Anthropic, Google) with existing items as context.

## Current State Analysis

### ✅ What's Already Available
- **AI Dependencies**: `@anthropic-ai/sdk`, `@google/generative-ai`, `openai` packages installed
- **Environment Variables**: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` expected in env.local
- **UI Components**: 
  - `ModelSelect` component with AI provider icons
  - `Dialog` components for modals
  - `Select`, `Textarea`, `Button` components
- **Collection Structure**: 
  - Collections defined with schema and fields
  - Content items stored in `content_items` table with JSONB `data` field
  - Draft/publish workflow already implemented
- **API Endpoints**: 
  - `/api/admin/content/[collection]` for creating items
  - `/api/admin/content/[collection]/[id]` for updating items
  - Collection metadata available via `/api/admin/collections`

### 🔧 What Needs to be Built

## 1. Backend API Endpoints

### 1.1 AI Generation API Route
**File**: `src/app/api/admin/ai/generate-content/route.ts`

```typescript
interface GenerateContentRequest {
  collection: string;
  siteId: string;
  prompt: string;
  model: string; // 'gpt-4', 'claude-3-5-sonnet', 'gemini-pro'
  contextItems?: string[]; // Array of content item IDs for context
  count?: number; // Number of items to generate (default: 1)
}

interface GenerateContentResponse {
  success: boolean;
  items: ContentItem[];
  errors?: string[];
}
```

**Features**:
- Validate user permissions for collection
- Fetch collection schema and context items
- Build AI prompt with collection structure and context
- Handle multiple AI providers (OpenAI, Anthropic, Google)
- Generate multiple items in one request
- Return structured content matching collection schema
- Error handling for API failures

### 1.2 AI Models Configuration
**File**: `src/lib/ai/models.ts`

```typescript
export const AI_MODELS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o', description: 'Latest GPT-4 model' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Fast and capable' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' }
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', description: 'Best reasoning' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku', description: 'Fast and efficient' }
  ],
  google: [
    { value: 'gemini-pro', label: 'Gemini Pro', description: 'Google\'s flagship model' },
    { value: 'gemini-flash', label: 'Gemini Flash', description: 'Fast responses' }
  ]
};
```

### 1.3 AI Service Layer
**File**: `src/lib/ai/service.ts`

```typescript
export class AIService {
  async generateContent(params: GenerateContentParams): Promise<ContentItem[]>
  private buildPrompt(collection: CollectionConfig, contextItems: ContentItem[], userPrompt: string): string
  private callOpenAI(prompt: string, model: string): Promise<any>
  private callAnthropic(prompt: string, model: string): Promise<any>
  private callGoogle(prompt: string, model: string): Promise<any>
  private parseAIResponse(response: any, collection: CollectionConfig): ContentItem[]
}
```

## 2. Frontend Components

### 2.1 Generate Button in Collection Header
**File**: `src/components/admin/CollectionHeader.tsx` (modify existing)

Add "Generate" button next to the "New" button:
```tsx
<Button onClick={onOpenGenerateModal} size="sm" className="whitespace-nowrap" variant="outline">
  <Sparkles className="w-4 h-4" />
  Generate
</Button>
```

### 2.2 AI Generation Modal
**File**: `src/components/admin/AIGenerationModal.tsx`

```tsx
interface AIGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: CollectionConfig;
  existingItems: ContentItem[];
  onGenerate: (items: ContentItem[]) => void;
}
```

**Modal Structure**:
1. **Header**: "Generate with AI" + collection name
2. **Context Selection**: Multi-select dropdown for existing items
3. **Number of Items**: A selector to choose how many items to generate (e.g., 1-10).
4. **Prompt Section**: 
   - Large textarea for user prompt
   - Model selector in bottom-left (like Cursor)
   - Character count
5. **Generation Results**: 
   - Loading state during generation
   - Generated items preview with edit capability
   - Regenerate button for individual items
6. **Actions**: Cancel, Accept (adds to collection as drafts)

### 2.3 Generated Content Preview
**File**: `src/components/admin/GeneratedContentPreview.tsx`

```tsx
interface GeneratedContentPreviewProps {
  items: ContentItem[];
  collection: CollectionConfig;
  onEdit: (itemIndex: number, field: string, value: any) => void;
  onRegenerate: (itemIndex: number) => void;
  onRemove: (itemIndex: number) => void;
}
```

**Features**:
- Show generated items in card format
- Inline editing of key fields (title, description)
- Individual regenerate buttons
- Remove unwanted items
- Field validation indicators

### 2.4 Context Item Selector
**File**: `src/components/admin/ContextItemSelector.tsx`

```tsx
interface ContextItemSelectorProps {
  items: ContentItem[];
  selectedItems: string[];
  onSelectionChange: (itemIds: string[]) => void;
  maxSelection?: number;
}
```

**Features**:
- Multi-select with checkboxes
- Search/filter functionality
- Show item titles and brief descriptions
- Limit selection (e.g., max 5 items for context)

## 3. Integration Points

### 3.1 Collection Table Integration
**File**: `src/components/admin/CollectionTable.tsx` (modify existing)

- Add `onOpenGenerateModal` prop to CollectionTable
- Pass through to CollectionHeader
- Handle generated items addition to table state

### 3.2 Collection Provider Integration
**File**: `src/app/admin/collections/[collection]/provider.tsx` (modify existing)

- Add state for AI generation modal
- Implement generate handler that calls API
- Add generated items to collection state
- Handle loading states

## 4. AI Prompt Engineering

### 4.1 Prompt Template
```
You are a content generation assistant for a headless CMS. Generate content items for a collection with the following structure:

COLLECTION: {collection.name}
DESCRIPTION: {collection.description}

SCHEMA:
{JSON.stringify(collection.fields, null, 2)}

CONTEXT ITEMS (for reference):
{contextItems.map(item => JSON.stringify(item.data, null, 2)).join('\n\n')}

USER REQUEST:
{userPrompt}

REQUIREMENTS:
1. Generate {count} content item(s)
2. Each item must follow the exact schema structure
3. All required fields must be populated
4. Generate unique, high-quality content
5. Use the context items as style/format reference
6. Return valid JSON array of content items

RESPONSE FORMAT:
[
  {
    "title": "...",
    "slug": "...",
    "data": {
      // All schema fields populated
    }
  }
]
```

### 4.2 Response Parsing
- Validate JSON structure
- Check required fields
- Generate slugs if not provided
- Handle partial failures gracefully

## 5. Error Handling & UX

### 5.1 Error States
- API key missing/invalid
- Rate limiting
- Model unavailable
- Invalid response format
- Network errors

### 5.2 Loading States
- Modal loading during generation
- Individual item regeneration
- Batch operations

### 5.3 Success States
- Generated items preview
- Clear acceptance flow
- Feedback on items added

## 6. Security Considerations

### 6.1 API Key Management
- Server-side API key storage only
- No client-side exposure
- Proper error messages without key details

### 6.2 Rate Limiting
- Implement per-user rate limiting
- Prevent abuse of AI APIs
- Cost monitoring considerations

### 6.3 Content Validation
- Sanitize AI-generated content
- Validate against collection schema
- Prevent injection attacks

## 7. Implementation Order

### Phase 1: Core Infrastructure
1. ✅ AI service layer with model abstractions
2. ✅ API endpoint for content generation
3. ✅ Basic prompt engineering

### Phase 2: UI Components
1. ✅ AI generation modal structure
2. ✅ Context item selector
3. ✅ Generated content preview
4. ✅ Integration with collection header

### Phase 3: Advanced Features
1. ✅ Individual item regeneration
2. ✅ Batch operations
3. ✅ Advanced prompt templates
4. ✅ Error handling and UX polish

### Phase 4: Testing & Optimization
1. ✅ Unit tests for AI service
2. ✅ Integration tests for API
3. ✅ E2E tests for UI flow
4. ✅ Performance optimization

## 8. Configuration & Settings

### 8.1 Environment Variables Required
```bash
# AI API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Optional: AI Service Configuration
AI_GENERATION_MAX_ITEMS=10
AI_GENERATION_TIMEOUT=30000
AI_GENERATION_RATE_LIMIT=100
```

### 8.2 Default Settings
- Default model: GPT-4o
- Max context items: 5
- Max generated items per request: 10
- Request timeout: 30 seconds

## 9. Testing Strategy

### 9.1 Unit Tests
- AI service methods
- Prompt building logic
- Response parsing
- Error handling

### 9.2 Integration Tests
- API endpoint functionality
- Database operations
- AI provider integration

### 9.3 E2E Tests
- Complete generation flow
- Modal interactions
- Error scenarios
- Multiple providers

## 10. Monitoring & Analytics

### 10.1 Metrics to Track
- Generation requests per user
- Success/failure rates
- Model usage distribution
- Average generation time
- Cost per generation

### 10.2 Error Logging
- API failures
- Invalid responses
- Rate limit hits
- User errors

## 11. Future Enhancements

### 11.1 Advanced Features
- Template-based generation
- Multi-language support
- Custom prompt templates
- Batch editing of generated items

### 11.2 AI Capabilities
- Image generation integration
- Content enhancement suggestions
- SEO optimization
- Automatic tagging

## Ready for Implementation

This plan provides a comprehensive roadmap for implementing AI-powered collection item generation. The codebase is well-structured and already has the necessary dependencies and patterns in place. The implementation should follow the phased approach outlined above, starting with core infrastructure and building up to advanced features.

The existing patterns in the codebase (modal dialogs, API routes, content management) provide excellent foundations for this feature. The AI service layer will integrate cleanly with the existing content management system, and the UI components will follow established design patterns. 