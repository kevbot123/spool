/**
 * Test for generateSpoolMetadata function
 */

import { generateSpoolMetadata } from '../utils/content';

describe('generateSpoolMetadata', () => {
  it('should use content.title as primary title source', () => {
    const content = {
      id: '123',
      title: 'Intuit is Slowly Killing Mailchimp\'s Free Plan, Here\'s Why',
      description: 'A detailed analysis of the changes',
      slug: 'mailchimp-free-plan'
    };

    const metadata = generateSpoolMetadata({
      content,
      collection: 'blog',
      path: '/blog/mailchimp-free-plan',
      siteUrl: 'https://example.com'
    });

    expect(metadata.title).toBe('Intuit is Slowly Killing Mailchimp\'s Free Plan, Here\'s Why');
    expect(metadata.description).toBe('A detailed analysis of the changes');
  });

  it('should prioritize seoTitle over title', () => {
    const content = {
      id: '123',
      title: 'Regular Title',
      seoTitle: 'SEO Optimized Title',
      description: 'Description',
      slug: 'test-post'
    };

    const metadata = generateSpoolMetadata({
      content,
      collection: 'blog',
      path: '/blog/test-post',
      siteUrl: 'https://example.com'
    });

    expect(metadata.title).toBe('SEO Optimized Title');
  });

  it('should fall back to Untitled only when no title is available', () => {
    const content = {
      id: '123',
      description: 'Description only',
      slug: 'no-title-post'
    };

    const metadata = generateSpoolMetadata({
      content,
      collection: 'blog',
      path: '/blog/no-title-post',
      siteUrl: 'https://example.com'
    });

    expect(metadata.title).toBe('Untitled');
  });

  it('should use ogTitle for OpenGraph when available', () => {
    const content = {
      id: '123',
      title: 'Regular Title',
      ogTitle: 'Social Media Title',
      description: 'Description',
      slug: 'test-post'
    };

    const metadata = generateSpoolMetadata({
      content,
      collection: 'blog',
      path: '/blog/test-post',
      siteUrl: 'https://example.com'
    });

    expect(metadata.title).toBe('Regular Title');
    expect(metadata.openGraph.title).toBe('Social Media Title');
  });

  it('should handle unified field access correctly', () => {
    const content = {
      id: '123',
      title: 'Main Title',
      description: 'Main Description',
      seoTitle: 'SEO Title',
      seoDescription: 'SEO Description',
      ogTitle: 'OG Title',
      ogDescription: 'OG Description',
      ogImage: 'https://example.com/image.jpg',
      slug: 'test-post'
    };

    const metadata = generateSpoolMetadata({
      content,
      collection: 'blog',
      path: '/blog/test-post',
      siteUrl: 'https://example.com'
    });

    expect(metadata.title).toBe('SEO Title');
    expect(metadata.description).toBe('SEO Description');
    expect(metadata.openGraph.title).toBe('OG Title');
    expect(metadata.openGraph.description).toBe('OG Description');
  });
});