# Supabase Realtime Live Updates - Implementation Tasks

## Task Overview

Convert the Supabase Realtime live updates design into a series of implementation tasks that build incrementally toward a production-ready system. Each task focuses on specific code implementation with proper testing and integration.

## Implementation Tasks

- [x] 1. Set up separate Supabase project with live updates schema
  - Create new dedicated Supabase project for live updates only
  - Create the `live_updates` table with proper structure and indexes
  - Create minimal `sites_auth` table for API key validation (site_id, api_key only)
  - Implement Row Level Security policies for site isolation
  - Set up automatic cleanup job for old entries
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 8.2_

- [x] 2. Implement live updates broadcaster in backend
  - Create `SupabaseLiveUpdatesBroadcaster` class with insert functionality
  - Integrate broadcaster into content management operations (create, update, publish, delete)
  - Add error handling and logging for broadcast failures
  - Implement cleanup job as Supabase Edge Function
  - Write unit tests for broadcaster functionality
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.4_

- [x] 3. Create live updates client for Next.js package
  - Implement `SupabaseLiveUpdatesClient` with Supabase Realtime connection
  - Add connection management with exponential backoff retry logic
  - Implement callback system for update notifications
  - Add proper error handling for authentication and rate limiting
  - Write unit tests for client connection and error scenarios
  - _Requirements: 4.1, 4.3, 6.1, 6.2, 6.3, 6.5_

- [x] 4. Integrate live updates into webhook handler
  - Update `createSpoolWebhookHandler` to initialize live updates in development
  - Add automatic connection establishment with user's API credentials
  - Implement update callback that triggers existing webhook handlers
  - Add development-specific logging and error messages
  - Ensure production mode disables live updates properly
  - _Requirements: 4.1, 4.2, 4.4, 4.5, 7.1, 7.2, 7.4_

- [x] 5. Set up separate Supabase project and embed credentials
  - Create dedicated Supabase project for live updates only (isolated from main database)
  - Set up minimal schema with only live_updates table and sites_auth table
  - Generate restricted anon key with read-only access to live updates
  - Embed credentials in Next.js package with proper security restrictions
  - Implement rate limiting and monitoring for credential usage
  - _Requirements: 2.1, 2.4, 8.3, 8.4_

- [x] 6. Add comprehensive error handling and resilience
  - Implement connection retry logic with exponential backoff
  - Add graceful fallback when live updates are unavailable
  - Create clear error messages with troubleshooting guidance
  - Add connection status logging for development experience
  - Test error scenarios including network failures and invalid credentials
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.3_

- [ ] 7. Add basic security and test core functionality
  - Test RLS policies manually with different API keys to ensure isolation
  - Add basic rate limiting to prevent obvious abuse
  - Test end-to-end flow: content change → broadcast → client receives update
  - Verify error handling works for invalid credentials and connection failures
  - _Requirements: 2.2, 8.1, 8.2_

- [ ] 8. Update Next.js package and documentation
  - Update package version to 2.1.0 with live updates support
  - Update integration guide with simple setup instructions
  - Add basic troubleshooting section for connection issues
  - _Requirements: 4.1, 7.1, 7.2, 7.3_

- [ ] 9. Deploy to production
  - Deploy separate Supabase project with live updates schema
  - Deploy updated Next.js package with embedded credentials
  - Test with a few real user sites to make sure it works
  - _Requirements: 1.1_

## Success Criteria

### Core Functionality
- ✅ Users can install package and get live updates with zero additional setup
- ✅ Content changes appear in connected apps within a few seconds
- ✅ Multiple users editing different sites receive only their own updates
- ✅ Basic error handling works for connection failures and invalid credentials

### Security
- ✅ RLS policies prevent cross-site data access (manually tested)
- ✅ Invalid API keys are rejected
- ✅ Separate Supabase project isolates live updates from main database

### Developer Experience
- ✅ Clear connection status logging in development
- ✅ Works without breaking existing webhook functionality
- ✅ Simple setup documentation

## Risk Mitigation

### Security Risks
- **Credential abuse**: Separate Supabase project limits blast radius
- **Cross-site data access**: RLS policies with manual testing
- **Cost escalation**: Basic rate limiting and Supabase's built-in limits

### Technical Risks
- **Connection issues**: Basic retry logic and graceful fallback
- **RLS policy bugs**: Manual testing with different API keys