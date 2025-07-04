import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMarkdownProcessor } from '@/lib/cms/markdown';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify API key and get site
async function verifySiteAccess(siteId: string, apiKey: string) {
  console.log('Verifying site access with:', { siteId, apiKey });
  const { data: site, error } = await supabase
    .from('sites')
    .select('id, user_id, api_key')
    .eq('id', siteId)
    .eq('api_key', apiKey)
    .single();

  if (error || !site) {
    console.error('Site access verification failed:', { error, site });
    return null;
  }

  console.log('Site access verified for:', site.id);
  return site;
}

// GET /api/spool/[siteId]/content/[collection] - List all content items in collection
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string; collection: string } }
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

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'published';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get collection
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('id, name, slug, schema')
      .eq('site_id', params.siteId)
      .eq('slug', params.collection)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Get content items
    let query = supabase
      .from('content_items')
      .select('id, slug, data, status, created_at, updated_at, published_at')
      .eq('site_id', params.siteId)
      .eq('collection_id', collection.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: contentItems, error: contentError } = await query;

    if (contentError) {
      console.error('Error fetching content:', contentError);
      return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
    }

    const markdownProcessor = getMarkdownProcessor();

    const processedItems = await Promise.all(
      (contentItems || []).map(async (item) => {
        const processedData = { ...item.data };
        if (collection.schema) {
          for (const field of collection.schema) {
            if (field.type === 'markdown' && processedData[field.name]) {
              processedData[`${field.name}_html`] = await markdownProcessor.processMarkdown(
                processedData[field.name]
              );
            }
          }
        }
        return { ...item, data: processedData };
      })
    );

    return NextResponse.json({
      collection: {
        name: collection.name,
        slug: collection.slug,
        schema: collection.schema
      },
      items: processedItems,
      pagination: {
        offset,
        limit,
        total: processedItems.length
      }
    });

  } catch (error) {
    console.error('Error in content API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// POST /api/spool/[siteId]/content/[collection] - Create new content item
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string; collection: string } }
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

    const { slug, data, status = 'draft' } = await request.json();

    if (!slug || !data) {
      return NextResponse.json({ error: 'Slug and data are required' }, { status: 400 });
    }

    // Get collection
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('id')
      .eq('site_id', params.siteId)
      .eq('slug', params.collection)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Create content item
    const { data: contentItem, error: contentError } = await supabase
      .from('content_items')
      .insert({
        site_id: params.siteId,
        collection_id: collection.id,
        slug,
        data,
        status,
        published_at: status === 'published' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (contentError) {
      console.error('Error creating content:', contentError);
      return NextResponse.json({ error: 'Failed to create content' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      item: contentItem
    });

  } catch (error) {
    console.error('Error creating content:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 