import { ContentManager } from '../content';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server');

const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};

const mockCollectionsQuery = {
  select: jest.fn(),
  eq: jest.fn(),
  single: jest.fn(),
};

const mockContentItemsQuery = {
  upsert: jest.fn(),
};

describe('ContentManager Site Isolation', () => {
  let contentManager: ContentManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock chain
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'collections') {
        return mockCollectionsQuery;
      }
      if (table === 'content_items') {
        return mockContentItemsQuery;
      }
      return {};
    });

    mockCollectionsQuery.select.mockReturnValue(mockCollectionsQuery);
    mockCollectionsQuery.eq.mockReturnValue(mockCollectionsQuery);
    
    // Mock auth to return a test user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });

    contentManager = new ContentManager(mockSupabaseClient as any);
  });

  describe('createContentBatch', () => {
    it('should enforce site isolation by always including site_id in collection query', async () => {
      const testSiteId = 'site-123';
      const testCollectionSlug = 'blog';
      
      // Mock successful collection lookup
      mockCollectionsQuery.single.mockResolvedValue({
        data: { id: 'collection-123', site_id: testSiteId },
        error: null,
      });
      
      // Mock successful content creation
      mockContentItemsQuery.upsert.mockResolvedValue({ error: null });

      const testItems = [
        { title: 'Test Post', data: { body: 'Test content' } },
      ];

      await contentManager.createContentBatch(testCollectionSlug, testItems, testSiteId);

      // Verify that the collection query includes both slug and site_id filters
      expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('slug', testCollectionSlug);
      expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('site_id', testSiteId);
      expect(mockCollectionsQuery.eq).toHaveBeenCalledTimes(2);
    });

    it('should throw descriptive error when collection not found in target site', async () => {
      const testSiteId = 'site-123';
      const testCollectionSlug = 'nonexistent-blog';
      
      // Mock collection not found
      mockCollectionsQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const testItems = [
        { title: 'Test Post', data: { body: 'Test content' } },
      ];

      await expect(
        contentManager.createContentBatch(testCollectionSlug, testItems, testSiteId)
      ).rejects.toThrow(
        `Collection '${testCollectionSlug}' not found in site '${testSiteId}'. Please verify the collection exists in the target site.`
      );
    });

    it('should not bypass site filtering for development placeholder UUID', async () => {
      const developmentSiteId = '00000000-0000-0000-0000-000000000000';
      const testCollectionSlug = 'blog';
      
      // Mock collection not found (should still enforce site filtering)
      mockCollectionsQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const testItems = [
        { title: 'Test Post', data: { body: 'Test content' } },
      ];

      await expect(
        contentManager.createContentBatch(testCollectionSlug, testItems, developmentSiteId)
      ).rejects.toThrow(
        `Collection '${testCollectionSlug}' not found in site '${developmentSiteId}'. Please verify the collection exists in the target site.`
      );

      // Verify site filtering is still applied even with development UUID
      expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('site_id', developmentSiteId);
    });

    it('should create content items with correct site_id from collection', async () => {
      const testSiteId = 'site-123';
      const testCollectionSlug = 'blog';
      const collectionId = 'collection-456';
      
      // Mock successful collection lookup
      mockCollectionsQuery.single.mockResolvedValue({
        data: { id: collectionId, site_id: testSiteId },
        error: null,
      });
      
      // Mock successful content creation
      mockContentItemsQuery.upsert.mockResolvedValue({ error: null });

      const testItems = [
        { title: 'Test Post 1', data: { body: 'Content 1' } },
        { title: 'Test Post 2', data: { body: 'Content 2' } },
      ];

      await contentManager.createContentBatch(testCollectionSlug, testItems, testSiteId);

      // Verify content items are created with correct site_id and collection_id
      expect(mockContentItemsQuery.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            site_id: testSiteId,
            collection_id: collectionId,
            title: 'Test Post 1',
          }),
          expect.objectContaining({
            site_id: testSiteId,
            collection_id: collectionId,
            title: 'Test Post 2',
          }),
        ]),
        { onConflict: 'site_id,collection_id,slug', ignoreDuplicates: true }
      );
    });

    it('should require siteId parameter', async () => {
      const testCollectionSlug = 'blog';
      const testItems = [
        { title: 'Test Post', data: { body: 'Test content' } },
      ];

      await expect(
        contentManager.createContentBatch(testCollectionSlug, testItems)
      ).rejects.toThrow('A valid siteId must be provided to create a content batch.');

      await expect(
        contentManager.createContentBatch(testCollectionSlug, testItems, '')
      ).rejects.toThrow('A valid siteId must be provided to create a content batch.');
    });

    it('should handle database errors gracefully', async () => {
      const testSiteId = 'site-123';
      const testCollectionSlug = 'blog';
      
      // Mock database error
      mockCollectionsQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'CONNECTION_ERROR', message: 'Database connection failed' },
      });

      const testItems = [
        { title: 'Test Post', data: { body: 'Test content' } },
      ];

      await expect(
        contentManager.createContentBatch(testCollectionSlug, testItems, testSiteId)
      ).rejects.toThrow(
        `Collection '${testCollectionSlug}' not found in site '${testSiteId}'. Please verify the collection exists in the target site.`
      );
    });
  });

  describe('createContent (single item)', () => {
    it('should enforce site isolation for single content creation', async () => {
      const testSiteId = 'site-123';
      const testCollectionSlug = 'blog';
      
      // Mock successful collection lookup
      mockCollectionsQuery.single.mockResolvedValue({
        data: { id: 'collection-123', site_id: testSiteId },
        error: null,
      });
      
      // Mock successful content creation
      const mockContentQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { 
                id: 'content-123', 
                title: 'Test Post', 
                site_id: testSiteId,
                collections: { slug: testCollectionSlug, site_id: testSiteId }
              },
              error: null,
            }),
          }),
        }),
      };
      
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'collections') return mockCollectionsQuery;
        if (table === 'content_items') return mockContentQuery;
        return {};
      });

      const testData = { title: 'Test Post', body: 'Test content' };
      await contentManager.createContent(testCollectionSlug, testData, testSiteId);

      // Verify collection lookup includes site filtering
      expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('slug', testCollectionSlug);
      expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('site_id', testSiteId);
    });

    it('should throw enhanced error when collection not found for single content creation', async () => {
      const testSiteId = 'site-123';
      const testCollectionSlug = 'nonexistent-blog';
      
      // Mock collection not found
      mockCollectionsQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const testData = { title: 'Test Post', body: 'Test content' };

      await expect(
        contentManager.createContent(testCollectionSlug, testData, testSiteId)
      ).rejects.toThrow(
        `Collection '${testCollectionSlug}' not found in site '${testSiteId}'. Please verify the collection exists in the target site.`
      );
    });
  });

  describe('Multi-site scenario simulation', () => {
    it('should prevent cross-site data contamination', async () => {
      // Simulate two sites with collections having the same slug
      const site1Id = 'site-111';
      const site2Id = 'site-222';
      const collectionSlug = 'blog';
      
      // First call for site 1
      mockCollectionsQuery.single.mockResolvedValueOnce({
        data: { id: 'collection-site1', site_id: site1Id },
        error: null,
      });
      mockContentItemsQuery.upsert.mockResolvedValueOnce({ error: null });

      const site1Items = [{ title: 'Site 1 Post', data: { body: 'Site 1 content' } }];
      await contentManager.createContentBatch(collectionSlug, site1Items, site1Id);

      // Verify first call used correct site filter
      expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('site_id', site1Id);

      // Reset mocks for second call
      jest.clearAllMocks();
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'collections') return mockCollectionsQuery;
        if (table === 'content_items') return mockContentItemsQuery;
        return {};
      });
      mockCollectionsQuery.select.mockReturnValue(mockCollectionsQuery);
      mockCollectionsQuery.eq.mockReturnValue(mockCollectionsQuery);

      // Second call for site 2
      mockCollectionsQuery.single.mockResolvedValueOnce({
        data: { id: 'collection-site2', site_id: site2Id },
        error: null,
      });
      mockContentItemsQuery.upsert.mockResolvedValueOnce({ error: null });

      const site2Items = [{ title: 'Site 2 Post', data: { body: 'Site 2 content' } }];
      await contentManager.createContentBatch(collectionSlug, site2Items, site2Id);

      // Verify second call used correct site filter
      expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('site_id', site2Id);
      
      // Verify content was created with correct site association
      expect(mockContentItemsQuery.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            site_id: site2Id,
            collection_id: 'collection-site2',
            title: 'Site 2 Post',
          }),
        ]),
        expect.any(Object)
      );
    });
  });
});