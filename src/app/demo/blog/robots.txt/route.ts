import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /

# Demo Blog Sitemap
Sitemap: ${baseUrl}/demo/blog/sitemap.xml

# Disallow admin areas (in production)
Disallow: /admin
Disallow: /api/admin

# Allow demo blog content
Allow: /demo/blog
Allow: /demo/spool-integration

# Crawl delay for demo purposes
Crawl-delay: 1`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400'
    }
  });
} 