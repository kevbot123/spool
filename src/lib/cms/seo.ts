import { ContentItem, CollectionConfig, SEOData, SchemaDefinition } from '@/types/cms';
import { getMarkdownProcessor } from './markdown';

export class SEOManager {
  private markdownProcessor = getMarkdownProcessor();
  private siteUrl: string;
  private siteName: string;

  constructor(siteUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000', siteName: string = 'Your Site') {
    this.siteUrl = siteUrl.replace(/\/$/, ''); // Remove trailing slash
    this.siteName = siteName;
  }

  generateSEOData(content: ContentItem, collection: CollectionConfig): SEOData {
    const url = this.generateUrl(content, collection);
    
    return {
      title: content.seoTitle || content.title,
      description: content.seoDescription || this.generateDescription(content),
      ogTitle: content.seoTitle || content.title,
      ogDescription: content.seoDescription || this.generateDescription(content),
      ogImage: this.generateOgImage(content, collection),
      canonicalUrl: url,
      jsonLd: this.generateJsonLd(content, collection, url)
    };
  }

  private generateUrl(content: ContentItem, collection: CollectionConfig): string {
    const path = collection.urlPattern.replace('{slug}', content.slug);
    return `${this.siteUrl}${path}`;
  }

  private generateDescription(content: ContentItem): string {
    // Use excerpt if available, otherwise generate from body
    if (content.data.excerpt) {
      return content.data.excerpt;
    }
    
    return this.markdownProcessor.extractExcerpt(content.body, 160);
  }

  private generateOgImage(content: ContentItem, collection: CollectionConfig): string {
    if (content.ogImage) {
      // If it's already a full URL, return as is
      if (content.ogImage.startsWith('http')) {
        return content.ogImage;
      }
      // Otherwise, prepend site URL
      return `${this.siteUrl}${content.ogImage}`;
    }
    
    // Use collection default
    if (collection.seo.defaultOgImage) {
      return `${this.siteUrl}${collection.seo.defaultOgImage}`;
    }
    
    // Fall back to site default
    return `${this.siteUrl}/og-default.png`;
  }

  private generateJsonLd(content: ContentItem, collection: CollectionConfig, url: string): SchemaDefinition[] {
    const schemas: SchemaDefinition[] = [];
    
    // Base article/webpage schema
    const baseSchema = this.generateBaseSchema(content, collection, url);
    schemas.push(baseSchema);
    
    // Add breadcrumb schema
    const breadcrumbSchema = this.generateBreadcrumbSchema(content, collection, url);
    schemas.push(breadcrumbSchema);
    
    // Add collection-specific schemas
    const specificSchemas = this.generateCollectionSpecificSchemas(content, collection, url);
    schemas.push(...specificSchemas);
    
    return schemas;
  }

  private generateBaseSchema(content: ContentItem, collection: CollectionConfig, url: string): SchemaDefinition {
    const readingTime = this.markdownProcessor.estimateReadingTime(content.body);
    
    if (collection.slug === 'blog') {
      return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: content.title,
        description: content.seoDescription || this.generateDescription(content),
        author: {
          '@type': 'Person',
          name: content.data.author || 'Unknown Author'
        },
        datePublished: content.publishedAt || content.createdAt,
        dateModified: content.updatedAt,
        image: this.generateOgImage(content, collection),
        url: url,
        timeRequired: `PT${readingTime}M`,
        keywords: content.data.tags?.join(', ') || '',
        articleSection: content.data.category || 'General',
        publisher: {
          '@type': 'Organization',
          name: this.siteName,
          logo: {
            '@type': 'ImageObject',
            url: `${this.siteUrl}/logo.png`
          }
        }
      };
    } else if (collection.slug === 'docs') {
      return {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: content.title,
        description: content.seoDescription || this.generateDescription(content),
        datePublished: content.publishedAt || content.createdAt,
        dateModified: content.updatedAt,
        image: this.generateOgImage(content, collection),
        url: url,
        proficiencyLevel: content.data.difficulty || 'Beginner',
        timeRequired: `PT${readingTime}M`
      };
    } else {
      return {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: content.title,
        description: content.seoDescription || this.generateDescription(content),
        url: url,
        datePublished: content.publishedAt || content.createdAt,
        dateModified: content.updatedAt,
        image: this.generateOgImage(content, collection)
      };
    }
  }

  private generateBreadcrumbSchema(content: ContentItem, collection: CollectionConfig, url: string): SchemaDefinition {
    const items = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: this.siteUrl
      }
    ];
    
    // Add collection level
    if (collection.slug !== 'landing-pages') {
      items.push({
        '@type': 'ListItem',
        position: 2,
        name: collection.name,
        item: `${this.siteUrl}/${collection.slug}`
      });
      
      items.push({
        '@type': 'ListItem',
        position: 3,
        name: content.title,
        item: url
      });
    } else {
      items.push({
        '@type': 'ListItem',
        position: 2,
        name: content.title,
        item: url
      });
    }
    
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items
    };
  }

  private generateCollectionSpecificSchemas(content: ContentItem, collection: CollectionConfig, url: string): SchemaDefinition[] {
    const schemas: SchemaDefinition[] = [];
    
    // Add FAQ schema if content has FAQ sections
    if (content.body.includes('## FAQ') || content.body.includes('## Frequently Asked Questions')) {
      const faqSchema = this.generateFAQSchema(content);
      if (faqSchema) schemas.push(faqSchema);
    }
    
    // Add Product schema for landing pages
    if (collection.slug === 'landing-pages' && content.data.pageType === 'Product') {
      const productSchema = this.generateProductSchema(content, url);
      schemas.push(productSchema);
    }
    
    // Add HowTo schema for tutorial content
    if (content.data.category === 'Tutorial' || content.body.includes('## Steps')) {
      const howToSchema = this.generateHowToSchema(content, url);
      if (howToSchema) schemas.push(howToSchema);
    }
    
    return schemas;
  }

  private generateFAQSchema(content: ContentItem): SchemaDefinition | null {
    // Extract FAQ sections from content
    const lines = content.body.split('\n');
    const faqs: Array<{ question: string; answer: string }> = [];
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('### ')) {
        const question = lines[i].substring(4).trim();
        let answer = '';
        
        // Collect answer lines until next heading or end
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].startsWith('### ') || lines[j].startsWith('## ')) {
            break;
          }
          if (lines[j].trim()) {
            answer += lines[j] + ' ';
          }
        }
        
        if (answer.trim()) {
          faqs.push({ question, answer: answer.trim() });
        }
      }
    }
    
    if (faqs.length === 0) return null;
    
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };
  }

  private generateProductSchema(content: ContentItem, url: string): SchemaDefinition {
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: content.data.heroTitle || content.title,
      description: content.data.heroSubtitle || content.seoDescription || this.generateDescription(content),
      url: url,
      image: this.generateOgImage(content, { seo: { defaultOgImage: '' } } as CollectionConfig),
      brand: {
        '@type': 'Organization',
        name: this.siteName
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock'
      }
    };
  }

  private generateHowToSchema(content: ContentItem, url: string): SchemaDefinition | null {
    const toc = this.markdownProcessor.generateTableOfContents(content.body);
    const steps = toc.filter(item => item.text.match(/^Step \d+/i));
    
    if (steps.length === 0) return null;
    
    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: content.title,
      description: content.seoDescription || this.generateDescription(content),
      url: url,
      step: steps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.text,
        url: `${url}#${step.slug}`
      }))
    };
  }

  generateSitemap(collections: CollectionConfig[], contentItems: ContentItem[]): string {
    const urls: string[] = [this.siteUrl];
    
    // Group content items by collection
    const contentByCollection = contentItems.reduce((acc, item) => {
      if (!acc[item.collection]) {
        acc[item.collection] = [];
      }
      acc[item.collection].push(item);
      return acc;
    }, {} as Record<string, ContentItem[]>);
    
    // Add collection index pages only if they have published content
    collections.forEach(collection => {
      if (collection.slug !== 'landing-pages') {
        const hasContent = contentByCollection[collection.slug] && contentByCollection[collection.slug].length > 0;
        if (hasContent) {
          urls.push(`${this.siteUrl}/${collection.slug}`);
        }
      }
    });
    
    // Add content pages
    contentItems.forEach(item => {
      const collection = collections.find(c => c.slug === item.collection);
      if (collection) {
        const url = collection.urlPattern.replace('{slug}', item.slug);
        urls.push(`${this.siteUrl}${url}`);
      }
    });
    
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>${url === this.siteUrl ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;
    
    return sitemap;
  }

  generateRobotsTxt(): string {
    return `User-agent: *
Allow: /

Sitemap: ${this.siteUrl}/sitemap.xml

# Disallow admin areas
User-agent: *
Disallow: /admin/
Disallow: /api/admin/

# Allow search engine crawlers
User-agent: Googlebot
User-agent: Bingbot
User-agent: Slurp
User-agent: DuckDuckBot
Allow: /

# LLM and AI crawlers
User-agent: GPTBot
User-agent: ChatGPT-User
User-agent: CCBot
User-agent: anthropic-ai
User-agent: Claude-Web
Allow: /`;
  }
}

// Singleton instance
let seoManager: SEOManager | null = null;

export function getSEOManager(siteUrl?: string, siteName?: string): SEOManager {
  if (!seoManager) {
    seoManager = new SEOManager(siteUrl, siteName);
  }
  return seoManager;
} 