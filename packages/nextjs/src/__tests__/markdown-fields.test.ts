/**
 * Test for markdown field functionality
 */

import { getSpoolContent } from '../utils/content';

// Mock fetch
global.fetch = jest.fn();

describe('Markdown Fields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle markdown fields correctly', async () => {
    const config = {
      siteId: 'test-site',
      apiKey: 'test-key',
      baseUrl: 'http://localhost:3000'
    };

    const mockItem = {
      id: '123',
      slug: 'test-post',
      data: {
        title: 'Test Post',
        body: '# Hello World',
        body_html: '<h1>Hello World</h1>'
      }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockItem),
      clone: jest.fn().mockReturnThis()
    } as any);

    const post = await getSpoolContent(config, 'blog', 'test-post');

    // Should return HTML by default
    expect(typeof post.body).toBe('string');
    expect(post.body).toBe('<h1>Hello World</h1>');
    
    // Should have markdown field
    expect(post.body_markdown).toBe('# Hello World');
  });
});