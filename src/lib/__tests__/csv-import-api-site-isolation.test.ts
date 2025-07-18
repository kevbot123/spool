/**
 * Integration tests for CSV import API site isolation
 * These tests verify that the import API properly enforces site isolation
 */

import { NextRequest } from 'next/server';

// Mock the import route handler
const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    getSession: jest.fn(),
  },
};

const mockContentManager = {
  createContentBatch: jest.fn(),
};

const mockCollectionsQuery = {
  select: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
};

// Mock all dependencies
jest.mock('@/lib/supabase/server', () => ({
  createSupabaseRouteHandlerClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
  createSupabaseAdminClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

jest.mock('@/lib/cms/content', () => ({
  ContentManager: jest.fn(() => mockContentManager),
}));

// Import the route handler after mocking
import { POST } from '@/app/api/admin/content/[collection]/import/route';

describe('CSV Import API Site Isolation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup query chain
    mockSupabaseClient.from.mockReturnValue(mockCollectionsQuery);
    mockCollectionsQuery.select.mockReturnValue(mockCollectionsQuery);
    mockCollectionsQuery.eq.mockReturnValue(mockCollectionsQuery);
    
    // Mock auth session
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'test-user' } } },
      error: null,
    });
  });

  const createMockRequest = (collection: string, siteId: string, csvContent: string = 'title,body\nTest Post,Test Content') => {
    const formData = new FormData();
    formData.append('file', new Blob([csvContent], { type: 'text/csv' }), 'test.csv');
    formData.append('mapping', JSON.stringify({ title: 'title', body: 'body' }));
    formData.append('siteId', siteId);

    return new NextRequest('http://localhost:3000/api/admin/content/blog/import', {
      method: 'POST',
      body: formData,
    });
  };

  it('should enforce site isolation in collection schema lookup', async () => {
    const testSiteId = 'site-123';
    const testCollection = 'blog';
    
    // Mock successful collection lookup
    mockCollectionsQuery.single.mockResolvedValue({
      data: { schema: { fields: [] } },
      error: null,
    });
    
    // Mock successful batch creation
    mockContentManager.createContentBatch.mockResolvedValue({
      success: 1,
      failed: 0,
      errors: [],
    });

    const request = createMockRequest(testCollection, testSiteId);
    const params = Promise.resolve({ collection: testCollection });

    await POST(request, { params });

    // Verify collection lookup includes site filtering
    expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('slug', testCollection);
    expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('site_id', testSiteId);
  });

  it('should return enhanced error message when collection not found', async () => {
    const testSiteId = 'site-123';
    const testCollection = 'nonexistent-blog';
    
    // Mock collection not found (PGRST116 is Supabase's "no rows found" error)
    mockCollectionsQuery.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    });

    const request = createMockRequest(testCollection, testSiteId);
    const params = Promise.resolve({ collection: testCollection });

    const response = await POST(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe(
      `Collection '${testCollection}' not found in the specified site. Please verify the collection exists and you have access to it.`
    );
  });

  it('should handle generic database errors with context', async () => {
    const testSiteId = 'site-123';
    const testCollection = 'blog';
    
    // Mock database error
    mockCollectionsQuery.single.mockResolvedValue({
      data: null,
      error: { code: 'CONNECTION_ERROR', message: 'Database connection failed' },
    });

    const request = createMockRequest(testCollection, testSiteId);
    const params = Promise.resolve({ collection: testCollection });

    const response = await POST(request, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe(
      `Error accessing collection '${testCollection}': Database connection failed`
    );
  });

  it('should pass correct parameters to ContentManager', async () => {
    const testSiteId = 'site-456';
    const testCollection = 'products';
    
    // Mock successful collection lookup
    mockCollectionsQuery.single.mockResolvedValue({
      data: { schema: { fields: [{ name: 'title', type: 'text' }] } },
      error: null,
    });
    
    // Mock successful batch creation
    mockContentManager.createContentBatch.mockResolvedValue({
      success: 1,
      failed: 0,
      errors: [],
    });

    const request = createMockRequest(testCollection, testSiteId);
    const params = Promise.resolve({ collection: testCollection });

    await POST(request, { params });

    // Verify ContentManager is called with correct parameters including siteId
    expect(mockContentManager.createContentBatch).toHaveBeenCalledWith(
      testCollection,
      expect.any(Array),
      testSiteId
    );
  });

  // Note: Testing ContentManager error handling is covered in the ContentManager unit tests
  // The integration here focuses on the API layer's site isolation enforcement

  it('should validate required parameters', async () => {
    const testCollection = 'blog';
    
    // Test missing siteId
    const formDataWithoutSiteId = new FormData();
    formDataWithoutSiteId.append('file', new Blob(['title\nTest'], { type: 'text/csv' }), 'test.csv');
    formDataWithoutSiteId.append('mapping', JSON.stringify({ title: 'title' }));

    const requestWithoutSiteId = new NextRequest('http://localhost:3000/api/admin/content/blog/import', {
      method: 'POST',
      body: formDataWithoutSiteId,
    });

    const params = Promise.resolve({ collection: testCollection });
    const response = await POST(requestWithoutSiteId, { params });
    const responseData = await response.json();

    expect(response.status).toBe(400);
    expect(responseData.error).toBe('Missing file, mapping, or siteId');
  });

  describe('Multi-site scenarios', () => {
    it('should handle concurrent imports to different sites with same collection names', async () => {
      const site1Id = 'site-111';
      const site2Id = 'site-222';
      const collectionSlug = 'blog';
      
      // Setup mocks for both calls
      mockCollectionsQuery.single
        .mockResolvedValueOnce({
          data: { schema: { fields: [{ name: 'title', type: 'text' }] } },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { schema: { fields: [{ name: 'title', type: 'text' }] } },
          error: null,
        });
      
      mockContentManager.createContentBatch
        .mockResolvedValueOnce({ success: 1, failed: 0, errors: [] })
        .mockResolvedValueOnce({ success: 1, failed: 0, errors: [] });

      // First import to site 1
      const request1 = createMockRequest(collectionSlug, site1Id, 'title\nSite 1 Post');
      const params1 = Promise.resolve({ collection: collectionSlug });
      
      const response1 = await POST(request1, { params: params1 });
      expect(response1.status).toBe(200);

      // Second import to site 2
      const request2 = createMockRequest(collectionSlug, site2Id, 'title\nSite 2 Post');
      const params2 = Promise.resolve({ collection: collectionSlug });
      
      const response2 = await POST(request2, { params: params2 });
      expect(response2.status).toBe(200);

      // Verify both calls used correct site filtering
      expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('site_id', site1Id);
      expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('site_id', site2Id);
      
      // Verify ContentManager was called with correct site IDs
      expect(mockContentManager.createContentBatch).toHaveBeenNthCalledWith(
        1, collectionSlug, expect.any(Array), site1Id
      );
      expect(mockContentManager.createContentBatch).toHaveBeenNthCalledWith(
        2, collectionSlug, expect.any(Array), site2Id
      );
    });
  });
});