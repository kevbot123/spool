/**
 * Tests for content item flattening functionality
 * Ensures unified field access (post.field instead of post.data.field)
 */

import { getSpoolContent, __testing__ } from '../utils/content';

const { flattenContentItem } = __testing__;

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock environment to simulate development mode
jest.mock('../utils/environment', () => ({
  detectEnvironment: () => ({
    isServer: false,
    isClient: true,
    isDevelopment: true,
    isProduction: false,
    isReactStrictMode: true,
  }),
  getEnvironmentCacheKey: () => 'client-dev',
}));

describe('Content Item Flattening', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('flattenContentItem', () => {
    it('should flatten data fields to top level', () => {
      const item = {
        id: '123',
        slug: 'test-post',
        title: 'System Title',
        status: 'published',
        created_at: '2024-01-01',
        data: {
          body: 'Post content',
          description: 'Post description',
          author: 'John Doe',
          tags: ['tech', 'cms']
        }
      };

      const flattened = flattenContentItem(item);

      // Should be able to access all fields directly
      expect(flattened.id).toBe('123');
      expect(flattened.slug).toBe('test-post');
      expect(flattened.title).toBe('System Title');
      expect(flattened.status).toBe('published');
      expect(flattened.created_at).toBe('2024-01-01');
      
      // Data fields should now be accessible directly
      expect(flattened.body).toBe('Post content');
      expect(flattened.description).toBe('Post description');
      expect(flattened.author).toBe('John Doe');
      expect(flattened.tags).toEqual(['tech', 'cms']);

      // Original data object should still exist for backward compatibility
      expect(flattened.data).toBeDefined();
      expect(flattened.data.body).toBe('Post content');
      expect(flattened.data.__deprecated).toContain('Access fields directly');
    });

    it('should handle data fields overriding system fields', () => {
      const item = {
        id: '123',
        title: 'System Title',
        data: {
          title: 'Custom Title', // This should override system title
          body: 'Post content'
        }
      };

      const flattened = flattenContentItem(item);

      // Data field should take precedence
      expect(flattened.title).toBe('Custom Title');
      expect(flattened.body).toBe('Post content');
      expect(flattened.id).toBe('123');
    });

    it('should handle items without data object', () => {
      const item = {
        id: '123',
        title: 'Test Title',
        status: 'published'
      };

      const flattened = flattenContentItem(item);

      expect(flattened).toEqual(item);
    });

    it('should handle null/undefined items', () => {
      expect(flattenContentItem(null)).toBeNull();
      expect(flattenContentItem(undefined)).toBeUndefined();
      expect(flattenContentItem('string')).toBe('string');
    });

    it('should handle empty data object', () => {
      const item = {
        id: '123',
        title: 'Test Title',
        data: {}
      };

      const flattened = flattenContentItem(item);

      expect(flattened.id).toBe('123');
      expect(flattened.title).toBe('Test Title');
      expect(flattened.data).toEqual({
        __deprecated: expect.any(String)
      } as any);
    });
  });

  describe('getSpoolContent with flattening', () => {
    const config = {
      apiKey: 'test-key',
      siteId: 'test-site',
      baseUrl: 'http://localhost:3000'
    };

    it('should return flattened single item', async () => {
      const mockItem = {
        id: '123',
        slug: 'test-post',
        title: 'System Title',
        status: 'published',
        data: {
          body: 'Post content',
          description: 'Post description',
          author: 'John Doe'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockItem),
        clone: jest.fn().mockReturnThis(),
      } as any);

      const result = await getSpoolContent(config, 'blog', 'test-post');

      // Should be able to access all fields directly
      expect(result.id).toBe('123');
      expect(result.slug).toBe('test-post');
      expect(result.title).toBe('System Title');
      expect(result.body).toBe('Post content');
      expect(result.description).toBe('Post description');
      expect(result.author).toBe('John Doe');

      // Backward compatibility
      expect(result.data.body).toBe('Post content');
    });

    it('should return flattened collection items', async () => {
      const mockItems = [
        {
          id: '1',
          slug: 'post-1',
          title: 'Post 1',
          data: {
            body: 'Content 1',
            author: 'Author 1'
          }
        },
        {
          id: '2',
          slug: 'post-2',
          title: 'Post 2',
          data: {
            body: 'Content 2',
            author: 'Author 2'
          }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockItems),
        clone: jest.fn().mockReturnThis(),
      } as any);

      const result = await getSpoolContent(config, 'blog');

      expect(result).toHaveLength(2);
      
      // First item
      expect(result[0].id).toBe('1');
      expect(result[0].title).toBe('Post 1');
      expect(result[0].body).toBe('Content 1');
      expect(result[0].author).toBe('Author 1');

      // Second item
      expect(result[1].id).toBe('2');
      expect(result[1].title).toBe('Post 2');
      expect(result[1].body).toBe('Content 2');
      expect(result[1].author).toBe('Author 2');

      // Backward compatibility
      expect(result[0].data.body).toBe('Content 1');
      expect(result[1].data.body).toBe('Content 2');
    });

    it('should handle API response with items wrapper', async () => {
      const mockResponse = {
        items: [
          {
            id: '1',
            slug: 'post-1',
            data: {
              title: 'Post 1',
              body: 'Content 1'
            }
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
        clone: jest.fn().mockReturnThis(),
      } as any);

      const result = await getSpoolContent(config, 'blog');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].title).toBe('Post 1');
      expect(result[0].body).toBe('Content 1');
    });

    it('should handle markdown HTML fields', async () => {
      const mockItem = {
        id: '123',
        slug: 'test-post',
        data: {
          title: 'Test Post',
          body: '# Heading\n\nContent',
          body_html: '<h1>Heading</h1><p>Content</p>'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockItem),
        clone: jest.fn().mockReturnThis(),
      } as any);

      const result = await getSpoolContent(config, 'blog', 'test-post', { renderHtml: true });

      expect(result.title).toBe('Test Post');
      // body should now default to HTML (React-serializable)
      expect(result.body).toBe('<h1>Heading</h1><p>Content</p>');
      // Raw markdown should be accessible via _markdown field
      expect(result.body_markdown).toBe('# Heading\n\nContent');
      // body_html should be removed since body now contains HTML
      expect(result.body_html).toBeUndefined();
    });
  });

  describe('Developer Experience', () => {
    it('should provide consistent field access pattern', async () => {
      const config = {
        apiKey: 'test-key',
        siteId: 'test-site',
        baseUrl: 'http://localhost:3000'
      };

      const mockItem = {
        id: '123',
        slug: 'test-post',
        title: 'System Title', // System field
        status: 'published',   // System field
        created_at: '2024-01-01',
        data: {
          body: 'Post content',        // Custom field
          description: 'Description',  // Custom field
          author: 'John Doe',         // Custom field
          featured: true,             // Custom field
          tags: ['tech', 'cms']       // Custom field
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockItem),
        clone: jest.fn().mockReturnThis(),
      } as any);

      const post = await getSpoolContent(config, 'blog', 'test-post');

      // All fields should be accessible with the same pattern: post.fieldName
      expect(post.id).toBe('123');           // System field
      expect(post.slug).toBe('test-post');   // System field  
      expect(post.title).toBe('System Title'); // System field
      expect(post.status).toBe('published'); // System field
      expect(post.created_at).toBe('2024-01-01'); // System field
      
      expect(post.body).toBe('Post content');        // Custom field
      expect(post.description).toBe('Description');  // Custom field
      expect(post.author).toBe('John Doe');         // Custom field
      expect(post.featured).toBe(true);             // Custom field
      expect(post.tags).toEqual(['tech', 'cms']);   // Custom field

      // This is the improved DX - no more post.data.field!
      // Before: post.data.body, post.data.author, etc.
      // After:  post.body, post.author, etc.
    });
  });
});