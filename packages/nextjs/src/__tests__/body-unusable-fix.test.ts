/**
 * Test for the "Body is unusable" error fix
 */

import { getSpoolContent } from '../utils/content';
import { globalCache } from '../utils/cache';

// Mock fetch to simulate the "Body is unusable" error
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock environment to simulate client-side behavior
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

describe('Body is unusable error fix', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    globalCache.clear();
  });

  it('should handle "Body is unusable" error and retry', async () => {
    const config = {
      apiKey: 'test-key',
      siteId: 'test-site',
      baseUrl: 'http://localhost:3000'
    };

    const mockData = {
      id: '1',
      slug: 'test-post',
      data: { title: 'Test Post', body: 'Test content' }
    };

    // First call fails with "Body is unusable"
    const bodyUnusableError = new Error('Body is unusable');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockRejectedValue(bodyUnusableError),
      clone: jest.fn().mockReturnThis(),
    });

    // Second call (retry) succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockData),
      clone: jest.fn().mockReturnThis(),
    });

    const result = await getSpoolContent(config, 'blog', 'test-post');
    expect(result).toEqual(mockData);

    // Should have made 2 fetch calls (failed + retry)
    expect(mockFetch).toHaveBeenCalledTimes(2);
    
    // Second call should have cache: 'no-store'
    expect(mockFetch).toHaveBeenNthCalledWith(2, expect.any(String), 
      expect.objectContaining({
        cache: 'no-store'
      })
    );
  });

  it('should handle "disturbed" error and retry', async () => {
    const config = {
      apiKey: 'test-key',
      siteId: 'test-site',
      baseUrl: 'http://localhost:3000'
    };

    const mockData = {
      id: '1',
      slug: 'test-post',
      data: { title: 'Test Post', body: 'Test content' }
    };

    // First call fails with "disturbed" error
    const disturbedError = new Error('Body stream is disturbed');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockRejectedValue(disturbedError),
      clone: jest.fn().mockReturnThis(),
    });

    // Second call (retry) succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockData),
      clone: jest.fn().mockReturnThis(),
    });

    const result = await getSpoolContent(config, 'blog', 'test-post');
    expect(result).toEqual(mockData);

    // Should have made 2 fetch calls (failed + retry)
    expect(mockFetch).toHaveBeenCalledTimes(2);
    
    // Second call should have cache: 'no-store'
    expect(mockFetch).toHaveBeenNthCalledWith(2, expect.any(String), 
      expect.objectContaining({
        cache: 'no-store'
      })
    );
  });

  it('should return null for non-body-related JSON errors', async () => {
    const config = {
      apiKey: 'test-key',
      siteId: 'test-site',
      baseUrl: 'http://localhost:3000'
    };

    const syntaxError = new SyntaxError('Unexpected token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockRejectedValue(syntaxError),
      clone: jest.fn().mockReturnThis(),
    });

    // Should return null instead of throwing (error handling in getSpoolContent)
    const result = await getSpoolContent(config, 'blog', 'test-post');
    expect(result).toBeNull();

    // Should only make 1 fetch call (no retry for syntax errors)
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});