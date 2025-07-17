// SEO components for @spoolcms/nextjs package
import Head from 'next/head';
import { ContentItem, CollectionConfig, SEOData } from '@/types/cms';
import { getSEOManager } from '@/lib/cms/seo';

interface SpoolSEOProps {
  content: ContentItem;
  collection: CollectionConfig;
  path: string;
  siteUrl?: string;
  siteName?: string;
}

export function SpoolSEO({ content, collection, path, siteUrl, siteName }: SpoolSEOProps) {
  const seoManager = getSEOManager(siteUrl, siteName);
  const seoData = seoManager.generateSEOData(content, collection);

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{seoData.title}</title>
      <meta name="description" content={seoData.description} />
      {content.canonicalUrl && <link rel="canonical" href={content.canonicalUrl} />}
      {content.noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={seoData.ogTitle} />
      <meta property="og:description" content={seoData.ogDescription} />
      <meta property="og:image" content={seoData.ogImage} />
      <meta property="og:url" content={seoData.canonicalUrl} />
      <meta property="og:type" content="article" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoData.ogTitle} />
      <meta name="twitter:description" content={seoData.ogDescription} />
      <meta name="twitter:image" content={seoData.ogImage} />

      {/* Article Meta Tags */}
      {content.publishedAt && (
        <meta property="article:published_time" content={content.publishedAt} />
      )}
      {content.updatedAt && (
        <meta property="article:modified_time" content={content.updatedAt} />
      )}
      {content.data.author && (
        <meta property="article:author" content={content.data.author} />
      )}
      {content.data.tags && (
        content.data.tags.map((tag: string) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))
      )}

      {/* JSON-LD Structured Data */}
      {seoData.jsonLd.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 2) }}
        />
      ))}
    </Head>
  );
}

// For App Router (Next.js 13+)
export function generateSpoolMetadata({ content, collection, path, siteUrl, siteName }: SpoolSEOProps) {
  const seoManager = getSEOManager(siteUrl, siteName);
  const seoData = seoManager.generateSEOData(content, collection);

  return {
    title: seoData.title,
    description: seoData.description,
    canonical: content.canonicalUrl,
    robots: content.noIndex ? 'noindex,nofollow' : 'index,follow',
    
    openGraph: {
      title: seoData.ogTitle,
      description: seoData.ogDescription,
      url: seoData.canonicalUrl,
      images: [
        {
          url: seoData.ogImage,
          width: 1200,
          height: 630,
          alt: seoData.ogTitle,
        },
      ],
      type: 'article',
      publishedTime: content.publishedAt,
      modifiedTime: content.updatedAt,
      authors: content.data.author ? [content.data.author] : undefined,
      tags: content.data.tags,
    },
    
    twitter: {
      card: 'summary_large_image',
      title: seoData.ogTitle,
      description: seoData.ogDescription,
      images: [seoData.ogImage],
    },

    other: {
      // Add JSON-LD as script tags
      ...seoData.jsonLd.reduce((acc, schema, index) => {
        acc[`jsonld-${index}`] = JSON.stringify(schema);
        return acc;
      }, {} as Record<string, string>),
    },
  };
}

interface SpoolSitemapConfig {
  siteUrl: string;
  collections: Array<{
    name: string;
    changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
    priority: number;
    path: string;
  }>;
}

export async function getSpoolSitemap(config: SpoolSitemapConfig): Promise<string> {
  // This would fetch from Spool API in real implementation
  const response = await fetch(`${process.env.SPOOL_API_BASE}/api/spool/${process.env.SPOOL_SITE_ID}/sitemap`, {
    headers: {
      'Authorization': `Bearer ${process.env.SPOOL_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to generate sitemap');
  }

  return response.text();
}

interface SpoolRobotsConfig {
  siteUrl: string;
  additionalDisallows?: string[];
}

export async function getSpoolRobots(config: SpoolRobotsConfig): Promise<string> {
  const seoManager = getSEOManager(config.siteUrl);
  let robots = seoManager.generateRobotsTxt();

  // Add additional disallows
  if (config.additionalDisallows && config.additionalDisallows.length > 0) {
    const additionalRules = config.additionalDisallows
      .map(path => `Disallow: ${path}`)
      .join('\n');
    
    robots = robots.replace('Allow: /', `Allow: /\n\n# Additional restrictions\n${additionalRules}`);
  }

  return robots;
}

// OG Image Generation (would be in separate file in real package)
interface OGImageTemplate {
  (props: { title: string; collection: string; [key: string]: any }): React.ReactNode;
}

interface SpoolOGImageConfig {
  width: number;
  height: number;
  templates: Record<string, OGImageTemplate>;
}

export function SpoolOGImage(config: SpoolOGImageConfig) {
  return async function handler(req: Request) {
    const url = new URL(req.url);
    const title = url.searchParams.get('title') || 'Untitled';
    const collection = url.searchParams.get('collection') || 'default';
    
    const template = config.templates[collection] || config.templates.default;
    
    if (!template) {
      return new Response('Template not found', { status: 404 });
    }

    // In real implementation, this would use @vercel/og or similar
    // to generate the actual image
    const html = `
      <div style="
        width: ${config.width}px;
        height: ${config.height}px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-family: Inter, sans-serif;
        padding: 40px;
        box-sizing: border-box;
      ">
        <h1 style="
          font-size: 48px;
          font-weight: bold;
          text-align: center;
          margin: 0;
          line-height: 1.2;
        ">${title}</h1>
        <p style="
          font-size: 24px;
          margin-top: 20px;
          opacity: 0.9;
        ">${collection.charAt(0).toUpperCase() + collection.slice(1)}</p>
      </div>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  };
}

// SEO Analytics and Performance Tracking
interface SpoolAnalyticsProps {
  trackCoreWebVitals?: boolean;
  gtmId?: string;
  customEvents?: Record<string, any>;
}

export function SpoolAnalytics({ trackCoreWebVitals, gtmId, customEvents }: SpoolAnalyticsProps) {
  // In real implementation, this would include Core Web Vitals tracking
  // and integration with Google Analytics/GTM
  return null; // Placeholder for now
} 