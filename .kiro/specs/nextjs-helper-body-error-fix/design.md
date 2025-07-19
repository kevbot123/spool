# Design Document

## Overview

This design creates a robust, industry-standard headless CMS integration that works seamlessly with Next.js server components while maintaining backward compatibility with client components. The solution implements proper request deduplication, environment detection, and caching strategies that match the behavior of leading headless CMS products like Contentful and Strapi.

## Architecture

### Core Components

1. **Environment Detection Layer** - Automatically detects server vs client context
2. **Request Deduplication Engine** - Prevents duplicate requests using React's cache() API
3. **Unified Configuration System** - Handles environment variables across contexts
4. **Error Handling & Retry Logic** - Robust error handling with appropriate fallbacks
5. **Next.js Integration Layer** - Proper integration with Next.js caching and revalidation

### Request Flow

```
Component Request → Environment Detection → Configuration Resolution → Request Deduplication → API Call → Response Caching → Component Render
```

## Components and Interfaces

### 1. Environment Detection

```typescript
interface EnvironmentContext {
  isServer: boolean;
  isClient: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
}

function detectEnvironment(): EnvironmentContext;
```

**Purpose:** Automatically detect the execution context to choose appropriate behavior patterns.

**Implementation:** Use `typeof window`, `process.env.NODE_ENV`, and other environment indicators.

### 2. Configuration Resolution

```typescript
interface SpoolConfig {
  apiKey: string;
  siteId: string;
  baseUrl?: string;
}

interface ResolvedConfig extends SpoolConfig {
  apiKey: string;
  siteId: string;
  baseUrl: string;
  environment: EnvironmentContext;
}

function resolveConfig(config: SpoolConfig): ResolvedConfig;
```

**Purpose:** Resolve configuration from multiple sources (direct config, environment variables) based on execution context.

**Implementation:** 
- Server context: Use `process.env.SPOOL_API_KEY` and `process.env.SPOOL_SITE_ID`
- Client context: Use `process.env.NEXT_PUBLIC_SPOOL_API_KEY` and `process.env.NEXT_PUBLIC_SPOOL_SITE_ID`
- Fallback to provided config values

### 3. Request Deduplication Engine

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

interface RequestDeduplicator {
  get<T>(key: string): CacheEntry<T> | null;
  set<T>(key: string, data: T): void;
  setPromise<T>(key: string, promise: Promise<T>): void;
  clear(): void;
}
```

**Purpose:** Prevent duplicate requests and provide appropriate caching for both server and client contexts.

**Implementation:**
- Server context: Use React's `cache()` API for request deduplication
- Client context: Use in-memory Map with TTL for caching
- Development mode: More aggressive deduplication to handle hot reloading

### 4. Content Fetcher

```typescript
interface ContentFetcher {
  fetchContent<T>(
    config: ResolvedConfig,
    collection: string,
    slug?: string,
    options?: ContentOptions
  ): Promise<T>;
}

interface ContentOptions {
  renderHtml?: boolean;
  revalidate?: number;
  cache?: 'force-cache' | 'no-store' | 'default';
}
```

**Purpose:** Handle the actual API requests with proper error handling and retry logic.

**Implementation:**
- Use Next.js fetch with appropriate cache settings
- Implement exponential backoff for retries
- Handle network errors gracefully
- Support Next.js revalidation patterns

### 5. Public API

```typescript
// Main API function that works in both server and client contexts
export async function getSpoolContent<T = any>(
  config: SpoolConfig,
  collection: string,
  slug?: string,
  options?: ContentOptions
): Promise<T>;

// Hook for client components (optional, for React patterns)
export function useSpoolContent<T = any>(
  collection: string,
  slug?: string,
  options?: ContentOptions
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};
```

## Data Models

### Content Response Format

```typescript
interface SpoolContentItem {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  published_at: string;
  updated_at: string;
  data: Record<string, any>;
}

type SpoolContentResponse<T> = T extends string 
  ? SpoolContentItem | null  // Single item by slug
  : SpoolContentItem[];      // Collection of items
```

### Error Handling

```typescript
interface SpoolError extends Error {
  code: 'NETWORK_ERROR' | 'AUTH_ERROR' | 'NOT_FOUND' | 'RATE_LIMITED' | 'SERVER_ERROR';
  status?: number;
  retryable: boolean;
}
```

## Error Handling

### Error Categories

1. **Network Errors** - Connection issues, timeouts
2. **Authentication Errors** - Invalid API keys
3. **Not Found Errors** - Missing content or collections
4. **Rate Limiting** - Too many requests
5. **Server Errors** - Internal server issues

### Error Handling Strategy

1. **Retry Logic** - Exponential backoff for retryable errors
2. **Fallback Values** - Return empty arrays/null for missing content
3. **Error Boundaries** - Proper error propagation for React error boundaries
4. **Development Warnings** - Clear error messages in development mode

## Testing Strategy

### Unit Tests

1. **Environment Detection** - Test server/client context detection
2. **Configuration Resolution** - Test environment variable resolution
3. **Request Deduplication** - Test caching behavior in different contexts
4. **Error Handling** - Test all error scenarios and retry logic

### Integration Tests

1. **Server Component Integration** - Test with actual Next.js server components
2. **Client Component Integration** - Test with React hooks and client components
3. **Build Process Integration** - Test with generateStaticParams and build-time fetching
4. **Development Mode** - Test hot reloading and development server behavior

### Performance Tests

1. **Request Deduplication** - Verify no duplicate requests in concurrent scenarios
2. **Memory Usage** - Test cache cleanup and memory management
3. **Build Performance** - Test impact on build times with static generation

## Implementation Plan

### Phase 1: Core Infrastructure
- Environment detection system
- Configuration resolution
- Basic request deduplication

### Phase 2: Server Component Support
- React cache() integration
- Next.js fetch integration
- Server-side error handling

### Phase 3: Client Component Support
- Client-side caching
- React hooks implementation
- Client-side error handling

### Phase 4: Advanced Features
- Retry logic with exponential backoff
- Advanced caching strategies
- Performance optimizations

### Phase 5: Documentation & Examples
- Update integration guide
- Add comprehensive examples
- Migration guide from client-only approach

## Next.js Integration

### Server Components

```typescript
// ✅ This should work seamlessly
export default async function BlogPage() {
  const posts = await getSpoolContent(spoolConfig, 'blog');
  return <BlogList posts={posts} />;
}
```

### Static Generation

```typescript
// ✅ This should work for build-time generation
export async function generateStaticParams() {
  const posts = await getSpoolContent(spoolConfig, 'blog');
  return posts.map(post => ({ slug: post.slug }));
}
```

### Client Components

```typescript
// ✅ This should work for interactive features
'use client';
export default function InteractiveBlog() {
  const { data: posts, loading } = useSpoolContent('blog');
  return loading ? <Loading /> : <BlogList posts={posts} />;
}
```

## Performance Considerations

### Request Deduplication
- Use React's cache() for server-side deduplication
- Implement TTL-based caching for client-side
- Handle concurrent requests properly

### Memory Management
- Automatic cache cleanup based on TTL
- Prevent memory leaks in long-running applications
- Efficient storage of cached responses

### Network Optimization
- Proper HTTP caching headers
- Request batching where possible
- Compression support

This design ensures Spool CMS matches the developer experience of industry-leading headless CMS products while providing the flexibility and performance developers expect from modern Next.js applications.