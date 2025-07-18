import { getSpoolContent, getSpoolCollections, getSpoolSitemap, getSpoolRobots } from '../utils/content';
import { SpoolConfig } from '../types';

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('SpoolCMS Content Utilities', () => {
  const mockConfig: SpoolConfig = {
    apiKey: 'test-api-key',
    siteId: 'test-site-id',
    baseUrl: 'https://test.spoolcms.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSpoolContent', () => {
    it('should return content array for collection request', async () => {
      const mockData = [
        { id: '1', title: 'Post 1', slug: 'post-1' },
        { id: '2', title: 'Post 2', slug: 'post-2' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await getSpoolContent(mockConfig, 'blog');

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.spoolcms.com/api/spool/test-site-id/content/blog',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-api-key',
          },
        })
      );
    });

    it('should return single item for slug request', async () => {
      const mockData = { id: '1', title: 'Post 1', slug: 'post-1' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await getSpoolContent(mockConfig, 'blog', 'post-1');

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.spoolcms.com/api/spool/test-site-id/content/blog/post-1',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-api-key',
          },
        })
      );
    });

    it('should return empty array for collection request on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await getSpoolContent(mockConfig, 'blog');

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('SpoolCMS API error: HTTP 404 Not Found');
    });

    it('should return null for slug request on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await getSpoolContent(mockConfig, 'blog', 'non-existent');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('SpoolCMS API error: HTTP 404 Not Found');
    });

    it('should return empty array for collection request on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getSpoolContent(mockConfig, 'blog');

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('SpoolCMS content fetch failed:', expect.any(Error));
    });

    it('should return null for slug request on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getSpoolContent(mockConfig, 'blog', 'post-1');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('SpoolCMS content fetch failed:', expect.any(Error));
    });

    it('should return empty array for collection request on JSON parse error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as Response);

      const result = await getSpoolContent(mockConfig, 'blog');

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('SpoolCMS content fetch failed:', expect.any(Error));
    });

    it('should handle different response formats for collections', async () => {
      // Test with items wrapper
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: '1', title: 'Post 1' }] }),
      } as Response);

      const result1 = await getSpoolContent(mockConfig, 'blog');
      expect(result1).toEqual([{ id: '1', title: 'Post 1' }]);

      // Test with direct array
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '2', title: 'Post 2' }],
      } as Response);

      const result2 = await getSpoolContent(mockConfig, 'posts');
      expect(result2).toEqual([{ id: '2', title: 'Post 2' }]);

      // Test with unexpected format
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ unexpected: 'format' }),
      } as Response);

      const result3 = await getSpoolContent(mockConfig, 'other');
      expect(result3).toEqual([]);
    });

    it('should handle renderHtml option', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '1', title: 'Post 1', content: '<p>HTML content</p>' }],
      } as Response);

      await getSpoolContent(mockConfig, 'blog', undefined, { renderHtml: true });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.spoolcms.com/api/spool/test-site-id/content/blog?_html=true',
        expect.any(Object)
      );
    });
  });

  describe('getSpoolCollections', () => {
    it('should return collections array on success', async () => {
      const mockCollections = [
        { id: '1', name: 'Blog', slug: 'blog' },
        { id: '2', name: 'Pages', slug: 'pages' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCollections,
      } as Response);

      const result = await getSpoolCollections(mockConfig);

      expect(result).toEqual(mockCollections);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.spoolcms.com/api/spool/test-site-id/collections',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-api-key',
          },
        })
      );
    });

    it('should return empty array on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await getSpoolCollections(mockConfig);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('SpoolCMS Collections API error: HTTP 500 Internal Server Error');
    });

    it('should return empty array on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getSpoolCollections(mockConfig);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('SpoolCMS collections fetch failed:', expect.any(Error));
    });

    it('should handle different response formats', async () => {
      // Test with collections wrapper
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ collections: [{ id: '1', name: 'Blog' }] }),
      } as Response);

      const result1 = await getSpoolCollections(mockConfig);
      expect(result1).toEqual([{ id: '1', name: 'Blog' }]);

      // Test with direct array
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '2', name: 'Pages' }],
      } as Response);

      const result2 = await getSpoolCollections(mockConfig);
      expect(result2).toEqual([{ id: '2', name: 'Pages' }]);

      // Test with unexpected format
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ unexpected: 'format' }),
      } as Response);

      const result3 = await getSpoolCollections(mockConfig);
      expect(result3).toEqual([]);
    });
  });

  describe('getSpoolSitemap', () => {
    it('should return sitemap XML on success', async () => {
      const mockSitemap = '<?xml version="1.0" encoding="UTF-8"?><urlset>...</urlset>';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockSitemap,
      } as Response);

      const result = await getSpoolSitemap(mockConfig);

      expect(result).toBe(mockSitemap);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.spoolcms.com/api/spool/test-site-id/sitemap',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-api-key',
          },
        })
      );
    });

    it('should return empty string on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await getSpoolSitemap(mockConfig);

      expect(result).toBe('');
      expect(console.error).toHaveBeenCalledWith('SpoolCMS Sitemap API error: HTTP 404 Not Found');
    });

    it('should return empty string on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getSpoolSitemap(mockConfig);

      expect(result).toBe('');
      expect(console.error).toHaveBeenCalledWith('SpoolCMS sitemap fetch failed:', expect.any(Error));
    });
  });

  describe('getSpoolRobots', () => {
    it('should return robots.txt content on success', async () => {
      const mockRobots = 'User-agent: *\nDisallow: /admin/';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockRobots,
      } as Response);

      const result = await getSpoolRobots(mockConfig);

      expect(result).toBe(mockRobots);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.spoolcms.com/api/spool/test-site-id/robots',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-api-key',
          },
        })
      );
    });

    it('should return empty string on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      const result = await getSpoolRobots(mockConfig);

      expect(result).toBe('');
      expect(console.error).toHaveBeenCalledWith('SpoolCMS Robots API error: HTTP 403 Forbidden');
    });

    it('should return empty string on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getSpoolRobots(mockConfig);

      expect(result).toBe('');
      expect(console.error).toHaveBeenCalledWith('SpoolCMS robots fetch failed:', expect.any(Error));
    });
  });

  describe('Response body consumption bug prevention', () => {
    it('should not attempt to read response body multiple times', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockRejectedValue(new Error('Body already consumed')),
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      // This should not throw an error about body consumption
      const result = await getSpoolContent(mockConfig, 'blog');

      expect(result).toEqual([]);
      expect(mockResponse.json).not.toHaveBeenCalled(); // Should not try to read body on error
      expect(console.error).toHaveBeenCalledWith('SpoolCMS API error: HTTP 500 Internal Server Error');
    });

    it('should handle concurrent requests without race conditions', async () => {
      const mockData = [{ id: '1', title: 'Post 1' }];

      // Mock multiple successful responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData,
        } as Response);

      // Make concurrent requests
      const promises = [
        getSpoolContent(mockConfig, 'blog'),
        getSpoolContent(mockConfig, 'posts'),
        getSpoolContent(mockConfig, 'pages'),
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result: any) => {
        expect(result).toEqual(mockData);
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});