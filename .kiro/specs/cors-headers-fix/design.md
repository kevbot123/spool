# Design Document

## Overview

This design implements simple CORS headers for the Spool CMS API to enable local development workflows. The solution focuses on the essential functionality: allowing localhost requests while maintaining basic security.

## Architecture

### Core Components

1. **Simple CORS Middleware** - Adds CORS headers to API responses
2. **Basic Origin Validation** - Allows localhost + configurable origins per site

### Request Flow

```
Incoming Request → CORS Check → Add Headers → Continue to API Handler
```

## Simple Implementation

### 1. Basic CORS Headers

For immediate fix, we'll add these headers to all Spool API responses:

```typescript
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // Start permissive, can restrict later
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};
```

### 2. Preflight Handler

Handle OPTIONS requests:

```typescript
if (request.method === 'OPTIONS') {
  return new Response(null, { 
    status: 200, 
    headers: CORS_HEADERS 
  });
}
```

### 3. Add Headers to All API Responses

Modify existing API routes to include CORS headers in responses.

## Implementation Plan

### Step 1: Quick Fix - Add CORS Headers to All API Routes
- Add CORS headers to every Spool API response
- Handle OPTIONS preflight requests
- Use permissive settings initially (`Access-Control-Allow-Origin: *`)

### Step 2: Test with Your Current Issue
- Deploy the fix
- Test that localhost:3000 can now access www.spoolcms.com API
- Verify blog posts load correctly

### Step 3: Optional Future Enhancement
- Add per-site origin configuration if needed later
- Can restrict from `*` to specific origins if security becomes a concern

This keeps it simple and gets your customers unblocked immediately.