/**
 * Integration test for the "Body is unusable" error fix with real data
 */

import { getSpoolContent } from '../utils/content';

describe('Body is unusable integration test', () => {
  // Skip this test in CI/CD since it requires real API access
  const shouldSkip = !process.env.SPOOL_API_KEY || !process.env.SPOOL_SITE_ID;

  (shouldSkip ? describe.skip : describe)('with real API', () => {
    const config = {
      apiKey: process.env.SPOOL_API_KEY!,
      siteId: process.env.SPOOL_SITE_ID!,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    };

    it('should fetch the Audienceful + Stripe post without Body is unusable error', async () => {
      const result = await getSpoolContent(config, 'blog', 'boost-revenue-with-audienceful-stripe');
      
      expect(result).toBeTruthy();
      expect(result.data?.title).toBe('Boost Revenue with Audienceful + Stripe');
      expect(result.data?.body).toContain('Audienceful integration on Stripe');
      expect(result.slug).toBe('boost-revenue-with-audienceful-stripe');
    });

    it('should handle multiple requests to the same content without errors', async () => {
      const slug = 'boost-revenue-with-audienceful-stripe';
      
      // Make multiple concurrent requests
      const promises = Array(5).fill(null).map(() => 
        getSpoolContent(config, 'blog', slug)
      );
      
      const results = await Promise.all(promises);
      
      // All requests should succeed and return the same data
      results.forEach(result => {
        expect(result).toBeTruthy();
        expect(result.data?.title).toBe('Boost Revenue with Audienceful + Stripe');
        expect(result.slug).toBe(slug);
      });
    });
  });
});