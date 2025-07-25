import { getSpoolContent, getSpoolCollections } from '../utils/content';
import { SpoolConfig } from '../types';

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock environment to simulate development mode for error logging
jest.mock('../utils/environment', () => ({
  detectEnvironment: () => ({
    isServer: true,
    isClient: false,
    isDevelopment: true,
    isProduction: false,
    isReactStrictMode: false,
  }),
  getEnvironmentCacheKey: () => 'server-dev',
}));

describe('SpoolCMS Integration Tests', () => {
  const mockConfig: SpoolConfig = {
    apiKey: 'test-api-key',
    siteId: 'test-site-id',
    baseUrl: 'https://test.spoolcms.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    jest.restoreAllMocks();
  });

  describe('Real-world error scenarios', () => {
    it('should handle rate limiting gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response);

      const result = await getSpoolContent({ collection: 'blog', config: mockConfig });

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('SpoolCMS API error: HTTP 429 Too Many Requests');
    });

    it('should handle server errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await getSpoolContent({ collection: 'blog', config: mockConfig });

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('SpoolCMS API error: HTTP 500 Internal Server Error');
    });

    it('should handle authentication errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      const result = await getSpoolContent({ collection: 'blog', config: mockConfig });

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('SpoolCMS API error: HTTP 401 Unauthorized');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token in JSON');
        },
      } as unknown as Response);

      const result = await getSpoolContent({ collection: 'blog', config: mockConfig });

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('SpoolCMS content fetch failed:', expect.any(SyntaxError));
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      const result = await getSpoolContent({ collection: 'blog', config: mockConfig });

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('SpoolCMS content fetch failed:', expect.any(Error));
    });

    it('should handle DNS resolution failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));

      const result = await getSpoolContent({ collection: 'blog', config: mockConfig });

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('SpoolCMS content fetch failed:', expect.any(Error));
    });
  });

  describe('Concurrent request handling', () => {
    it('should handle multiple concurrent requests without race conditions', async () => {
      // Mock different responses for different endpoints
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: '1', title: 'Blog Post' }],
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: '2', title: 'Page' }],
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: '1', name: 'Blog' }, { id: '2', name: 'Pages' }],
        } as Response);

      // Make concurrent requests
      const [blogContent, pageContent, collections] = await Promise.all([
        getSpoolContent({ collection: 'blog', config: mockConfig }),
        getSpoolContent({ collection: 'pages', config: mockConfig }),
        getSpoolCollections(mockConfig),
      ]);

      expect(blogContent).toEqual([{ id: '1', title: 'Blog Post' }]);
      expect(pageContent).toEqual([{ id: '2', title: 'Page' }]);
      expect(collections).toEqual([{ id: '1', name: 'Blog' }, { id: '2', name: 'Pages' }]);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and error responses in concurrent requests', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: '1', title: 'Success' }],
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response)
        .mockRejectedValueOnce(new Error('Network error'));

      const [success, notFound, networkError] = await Promise.all([
        getSpoolContent({ collection: 'blog', config: mockConfig }),
        getSpoolContent({ collection: 'nonexistent', config: mockConfig }),
        getSpoolContent({ collection: 'error', config: mockConfig }),
      ]);

      expect(success).toEqual([{ id: '1', title: 'Success' }]);
      expect(notFound).toEqual([]);
      expect(networkError).toEqual([]);
      expect(console.error).toHaveBeenCalledTimes(2); // Two error calls
    });
  });

  describe('Edge cases and boundary conditions', () => {
    it('should handle empty responses correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      const result = await getSpoolContent({ collection: 'empty-collection', config: mockConfig });

      expect(result).toEqual([]);
    });

    it('should handle null responses correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      } as Response);

      const result = await getSpoolContent({ collection: 'blog', slug: 'nonexistent-slug', config: mockConfig });

      expect(result).toBeNull();
    });

    it('should handle very large responses without memory issues', async () => {
      // Simulate a large response
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        id: i.toString(),
        title: `Post ${i}`,
        content: 'Lorem ipsum '.repeat(100), // Large content
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => largeArray,
      } as Response);

      const result = await getSpoolContent({ collection: 'large-collection', config: mockConfig });

      expect(result).toHaveLength(1000);
      expect(result[0]).toEqual(expect.objectContaining({
        id: '0',
        title: 'Post 0',
      }));
    });

    it('should handle responses with special characters and unicode', async () => {
      const unicodeData = [
        { id: '1', title: 'Post with émojis 🚀', content: 'Content with 中文 and العربية' },
        { id: '2', title: 'Spëcîål chäractërs', content: 'More unicode: ñáéíóú' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => unicodeData,
      } as Response);

      const result = await getSpoolContent({ collection: 'unicode-collection', config: mockConfig });

      expect(result).toEqual(unicodeData);
    });
  });

  describe('Configuration edge cases', () => {
    it('should handle missing baseUrl gracefully', async () => {
      const configWithoutBaseUrl = {
        apiKey: 'test-api-key',
        siteId: 'test-site-id',
        // baseUrl is optional and should default
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '1', title: 'Post' }],
      } as Response);

      const result = await getSpoolContent({ collection: 'blog', config: configWithoutBaseUrl });

      expect(result).toEqual([{ id: '1', title: 'Post' }]);
      // Should use default baseUrl
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.spoolcms.com/api/spool/test-site-id/content/blog?_html=true',
        expect.any(Object)
      );
    });

    it('should handle empty API key gracefully', async () => {
      const configWithEmptyKey = {
        apiKey: '',
        siteId: 'test-site-id',
        baseUrl: 'https://test.spoolcms.com',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      const result = await getSpoolContent({ collection: 'blog', config: configWithEmptyKey });

      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer ',
          },
        })
      );
    });
  });

  describe('Marketing site reliability scenarios', () => {
    it('should ensure marketing site loads even when CMS is down', async () => {
      // Simulate complete CMS failure
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const [blogPosts, collections] = await Promise.all([
        getSpoolContent({ collection: 'blog', config: mockConfig }),
        getSpoolCollections(mockConfig),
      ]);

      // Site should still load with empty content
      expect(blogPosts).toEqual([]);
      expect(collections).toEqual([]);
      
      // Errors should be logged but not thrown
      expect(console.error).toHaveBeenCalledTimes(2);
    });

    it('should handle intermittent failures gracefully', async () => {
      // First request fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: '1', title: 'Post' }],
        } as Response);

      const firstResult = await getSpoolContent({ collection: 'blog', config: mockConfig });
      const secondResult = await getSpoolContent({ collection: 'blog', config: mockConfig });

      expect(firstResult).toEqual([]);
      expect(secondResult).toEqual([{ id: '1', title: 'Post' }]);
    });

    it('should handle partial API failures without breaking the site', async () => {
      // Content succeeds, collections fail
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: '1', title: 'Post' }],
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        } as Response);

      const [content, collections] = await Promise.all([
        getSpoolContent({ collection: 'blog', config: mockConfig }),
        getSpoolCollections(mockConfig),
      ]);

      expect(content).toEqual([{ id: '1', title: 'Post' }]);
      expect(collections).toEqual([]);
      
      // Only one error should be logged
      expect(console.error).toHaveBeenCalledTimes(1);
    });
  });
});