/**
 * Integration verification tests to ensure the site isolation fix doesn't break existing functionality
 */

import { ContentManager } from '@/lib/cms/content';

// Mock Supabase client for integration testing
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

describe('Integration Verification - Existing Functionality', () => {
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

  describe('Normal CSV import workflow', () => {
    it('should work correctly for single-site scenarios', async () => {
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
        {
          title: 'My First Test Post',
          data: {
            body_markdown: '<p>This is the body of my <strong>first</strong> post. It has some HTML.</p>',
            tags: 'first-post;cool-stuff'
          }
        },
        {
          title: 'Another Test Post',
          data: {
            body_markdown: 'This one is already in markdown.',
            tags: 'second-post;testing'
          }
        },
      ];

      const result = await contentManager.createContentBatch(testCollectionSlug, testItems, testSiteId);

      // Verify successful import
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);

      // Verify collection lookup included site filtering
      expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('slug', testCollectionSlug);
      expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('site_id', testSiteId);

      // Verify content items were created with correct site association
      expect(mockContentItemsQuery.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            site_id: testSiteId,
            collection_id: 'collection-123',
            title: 'My First Test Post',
          }),
          expect.objectContaining({
            site_id: testSiteId,
            collection_id: 'collection-123',
            title: 'Another Test Post',
          }),
        ]),
        { onConflict: 'site_id,collection_id,slug', ignoreDuplicates: true }
      );
    });

    it('should maintain backward compatibility for legitimate use cases', async () => {
      const testSiteId = 'real-site-456';
      const testCollectionSlug = 'products';

      // Mock successful collection lookup
      mockCollectionsQuery.single.mockResolvedValue({
        data: { id: 'collection-456', site_id: testSiteId },
        error: null,
      });

      // Mock successful content creation
      mockContentItemsQuery.upsert.mockResolvedValue({ error: null });

      const testItems = [
        {
          title: 'Product 1',
          data: {
            description: 'A great product',
            price: '29.99'
          }
        },
      ];

      const result = await contentManager.createContentBatch(testCollectionSlug, testItems, testSiteId);

      // Verify the fix doesn't break normal functionality
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);

      // Verify proper site isolation is enforced
      expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('site_id', testSiteId);
    });

    it('should properly handle development environment without bypassing site isolation', async () => {
      const developmentSiteId = '00000000-0000-0000-0000-000000000000';
      const testCollectionSlug = 'test-collection';

      // Mock successful collection lookup (should still require site match)
      mockCollectionsQuery.single.mockResolvedValue({
        data: { id: 'dev-collection-123', site_id: developmentSiteId },
        error: null,
      });

      // Mock successful content creation
      mockContentItemsQuery.upsert.mockResolvedValue({ error: null });

      const testItems = [
        { title: 'Dev Test Item', data: { content: 'Test content' } },
      ];

      const result = await contentManager.createContentBatch(testCollectionSlug, testItems, developmentSiteId);

      // Verify development environment still works but with proper site isolation
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);

      // Verify site filtering is still applied even in development
      expect(mockCollectionsQuery.eq).toHaveBeenCalledWith('site_id', developmentSiteId);
    });
  });

  describe('Error handling improvements', () => {
    it('should provide clear error messages for missing collections', async () => {
      const testSiteId = 'site-789';
      const testCollectionSlug = 'nonexistent-collection';

      // Mock collection not found
      mockCollectionsQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const testItems = [
        { title: 'Test Item', data: { content: 'Test content' } },
      ];

      await expect(
        contentManager.createContentBatch(testCollectionSlug, testItems, testSiteId)
      ).rejects.toThrow(
        `Collection '${testCollectionSlug}' not found in site '${testSiteId}'. Please verify the collection exists in the target site.`
      );
    });

    it('should require siteId parameter for all batch operations', async () => {
      const testCollectionSlug = 'blog';
      const testItems = [
        { title: 'Test Post', data: { body: 'Test content' } },
      ];

      // Test with undefined siteId
      await expect(
        contentManager.createContentBatch(testCollectionSlug, testItems, undefined)
      ).rejects.toThrow('A valid siteId must be provided to create a content batch.');

      // Test with empty string siteId
      await expect(
        contentManager.createContentBatch(testCollectionSlug, testItems, '')
      ).rejects.toThrow('A valid siteId must be provided to create a content batch.');
    });
  });
});