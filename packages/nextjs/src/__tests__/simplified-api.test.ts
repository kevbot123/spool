/**
 * Tests for the simplified API functions
 */

import { 
  generateSpoolMetadata, 
  getSpoolStaticParams, 
  generateSpoolSitemap,
  getSpoolContent 
} from '../utils/content';

// Mock environment variables
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    SPOOL_API_KEY: 'spool_test_key',
    SPOOL_SITE_ID: 'test-site-id',
    NEXT_PUBLIC_SITE_URL: 'https://example.com'
  };
});

afterEach(() => {
  process.env = originalEnv;
});

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Simplified API', () => {
  describe('generateSpoolMetadata', () => {
    it('should generate metadata with just content object', () => {
      const content = {
        title: 'Test Post',
        description: 'Test description',
        seoTitle: 'SEO Title',
        ogImage: 'https://example.com/image.jpg'
      };

      const metadata = generateSpoolMetadata(content);

      expect(metadata.title).toBe('SEO Title');
      expect(metadata.description).toBe('Test description');
      expect(metadata.openGraph.title).toBe('SEO Title');
      expect(metadata.openGraph.images[0].url).toBe('https://example.com/image.jpg');
    });

    it('should auto-detect site URL from environment', () => {
      const content = { title: 'Test' };
      const metadata = generateSpoolMetadata(content);
      
      expect(metadata.openGraph.siteName).toBe('https://example.com');
    });

    it('should handle missing content gracefully', () => {
      const metadata = generateSpoolMetadata(null);
      expect(metadata.title).toBe('Content Not Found');
    });
  });

  describe('getSpoolStaticParams', () => {
    it('should return array of slug objects', async () => {
      const mockPosts = [
        { slug: 'post-1', title: 'Post 1' },
        { slug: 'post-2', title: 'Post 2' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPosts,
      } as Response);

      const config = { apiKey: 'test', siteId: 'test' };
      const params = await getSpoolStaticParams({ collection: 'blog', config });

      expect(params).toEqual([
        { slug: 'post-1' },
        { slug: 'post-2' }
      ]);
    });

    it('should handle empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      const config = { apiKey: 'test', siteId: 'test' };
      const params = await getSpoolStaticParams({ collection: 'blog', config });

      expect(params).toEqual([]);
    });
  });

  describe('generateSpoolSitemap', () => {
    it('should generate sitemap with collections and static pages', async () => {
      const mockPosts = [
        { slug: 'post-1', updated_at: '2024-01-01T00:00:00Z' },
        { slug: 'post-2', updated_at: '2024-01-02T00:00:00Z' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPosts,
      } as Response);

      const config = { apiKey: 'test', siteId: 'test' };
      const sitemap = await generateSpoolSitemap({
        collections: ['blog'],
        staticPages: [
          { url: '/', priority: 1.0 },
          { url: '/about', priority: 0.8 }
        ],
        config
      });

      expect(sitemap).toHaveLength(4); // 2 static + 2 blog posts
      expect(sitemap[0].url).toBe('https://example.com/');
      expect(sitemap[0].priority).toBe(1.0);
      expect(sitemap[2].url).toBe('https://example.com/blog/post-1');
      expect(sitemap[2].priority).toBe(0.7);
    });
  });

  describe('getSpoolContent simplified API', () => {
    it('should work with new simplified syntax', async () => {
      const mockPost = { id: '1', title: 'Test Post', slug: 'test-post' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPost,
      } as Response);

      const result = await getSpoolContent({ collection: 'blog', slug: 'test-post' });

      expect(result).toEqual(expect.objectContaining({
        title: 'Test Post',
        slug: 'test-post'
      }));
    });

    it('should still work with legacy API', async () => {
      const mockPost = { id: '1', title: 'Test Post', slug: 'test-post' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPost,
      } as Response);

      const config = { apiKey: 'test', siteId: 'test' };
      const result = await getSpoolContent({ collection: 'blog', slug: 'test-post', config });

      expect(result).toEqual(expect.objectContaining({
        title: 'Test Post',
        slug: 'test-post'
      }));
    });
  });
});