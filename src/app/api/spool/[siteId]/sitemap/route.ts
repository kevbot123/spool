import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSEOManager } from '@/lib/cms/seo';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify API key and get site
async function verifySiteAccess(siteId: string, apiKey: string) {
  const { data: site, error } = await supabase
    .from('sites')
    .select('id, user_id, api_key, name, domain')
    .eq('id', siteId)
    .eq('api_key', apiKey)
    .single();

  if (error || !site) {
    return null;
  }

  return site;
}

// GET /api/spool/[siteId]/sitemap - Generate XML sitemap
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const site = await verifySiteAccess(params.siteId, apiKey);
    if (!site) {
      return NextResponse.json({ error: 'Invalid site or API key' }, { status: 401 });
    }

    const siteUrl = site.domain || 'http://localhost:3000';
    const seoManager = getSEOManager(siteUrl, site.name);

    // Get all collections
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('id, name, slug, url_pattern')
      .eq('site_id', params.siteId);

    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError);
      return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
    }

    // Get all published content items
    const { data: contentItems, error: contentError } = await supabase
      .from('content_items')
      .select('id, slug, collection_id, data, updated_at, published_at')
      .eq('site_id', params.siteId)
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (contentError) {
      console.error('Error fetching content:', contentError);
      return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
    }

    // Map content items to include collection info
    const collectionsMap = collections?.reduce((acc, col) => {
      acc[col.id] = col;
      return acc;
    }, {} as Record<string, any>) || {};

    const mappedContent = contentItems?.map(item => ({
      id: item.id,
      slug: item.slug,
      collection: collectionsMap[item.collection_id]?.slug || '',
      title: item.data.title || '',
      body: item.data.body || '',
      data: item.data,
      status: 'published' as const,
      createdAt: item.published_at || '',
      updatedAt: item.updated_at || '',
      publishedAt: item.published_at || '',
    })) || [];

    const mappedCollections = collections?.map(col => ({
      name: col.name,
      slug: col.slug,
      description: '',
      contentPath: '',
      urlPattern: col.url_pattern || `/${col.slug}/{slug}`,
      fields: [],
      seo: {}
    })) || [];

    // Generate sitemap XML
    const sitemapXml = seoManager.generateSitemap(mappedCollections, mappedContent);

    return new Response(sitemapXml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error generating sitemap:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 