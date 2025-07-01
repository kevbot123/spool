import { NextResponse } from 'next/server';

// Mock blog posts data for sitemap generation
const DEMO_POSTS = [
  {
    slug: 'getting-started-with-spool-cms',
    publishedAt: '2024-01-15T10:00:00Z',
    priority: 0.8
  },
  {
    slug: 'real-time-editing-features',
    publishedAt: '2024-01-12T14:30:00Z',
    priority: 0.7
  },
  {
    slug: 'seo-optimization-best-practices',
    publishedAt: '2024-01-10T16:00:00Z',
    priority: 0.8
  },
  {
    slug: 'building-dynamic-pages',
    publishedAt: '2024-01-08T11:00:00Z',
    priority: 0.7
  },
  {
    slug: 'api-integration-guide',
    publishedAt: '2024-01-05T09:15:00Z',
    priority: 0.7
  },
  {
    slug: 'content-modeling-strategies',
    publishedAt: '2024-01-03T13:45:00Z',
    priority: 0.6
  }
];

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Demo Blog Homepage -->
  <url>
    <loc>${baseUrl}/demo/blog</loc>
    <lastmod>2024-01-15T10:00:00Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- All Posts Page -->
  <url>
    <loc>${baseUrl}/demo/blog/posts</loc>
    <lastmod>2024-01-15T10:00:00Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Individual Blog Posts -->
  ${DEMO_POSTS.map(post => `
  <url>
    <loc>${baseUrl}/demo/blog/posts/${post.slug}</loc>
    <lastmod>${post.publishedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${post.priority}</priority>
  </url>`).join('')}
  
  <!-- Demo Integration Page -->
  <url>
    <loc>${baseUrl}/demo/spool-integration</loc>
    <lastmod>2024-01-15T10:00:00Z</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
} 