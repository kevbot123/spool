import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMarkdownProcessor } from '@/lib/cms/markdown';
import { corsJsonResponse, handleOptionsRequest } from '@/lib/cors';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify API key and get site
async function verifySiteAccess(siteId: string, apiKey: string) {
  const { data: site, error } = await supabase
    .from('sites')
    .select('id, user_id, api_key, domain')
    .eq('id', siteId)
    .eq('api_key', apiKey)
    .single();

  if (error || !site) {
    return null;
  }

  return site;
}

// OPTIONS /api/spool/[siteId]/content/[collection]/[slug] - Handle preflight requests
export async function OPTIONS() {
  return handleOptionsRequest();
}

// GET /api/spool/[siteId]/content/[collection]/[slug] - Get specific content item
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string; collection: string; slug: string } }
) {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return corsJsonResponse({ error: 'API key required' }, { status: 401 });
    }

    const site = await verifySiteAccess(params.siteId, apiKey);
    if (!site) {
      return corsJsonResponse({ error: 'Invalid site or API key' }, { status: 401 });
    }

    // Get collection
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('id, name, slug, schema')
      .eq('site_id', params.siteId)
      .eq('slug', params.collection)
      .single();

    if (collectionError || !collection) {
      return corsJsonResponse({ error: 'Collection not found' }, { status: 404 });
    }

    // Get content item
    const { data: contentItem, error: contentError } = await supabase
      .from('content_items')
      .select('id, slug, title, data, status, created_at, updated_at, published_at')
      .eq('site_id', params.siteId)
      .eq('collection_id', collection.id)
      .eq('slug', params.slug)
      .single();

    if (contentError || !contentItem) {
      return corsJsonResponse({ error: 'Content not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const renderHtml = url.searchParams.has('_html');
    const processedData = { ...contentItem.data };

    // Process markdown fields only if requested
    if (renderHtml) {
      const markdownProcessor = getMarkdownProcessor();
      if (collection.schema && Array.isArray(collection.schema.fields)) {
        for (const field of collection.schema.fields) {
          if (field.type === 'markdown' && processedData[field.name]) {
            processedData[`${field.name}_html`] = await markdownProcessor.processMarkdown(
              processedData[field.name]
            );
          }
        }
      }
    }

    const filledItem = { 
      ...contentItem, 
      data: processedData,
    };

    return corsJsonResponse(filledItem);

  } catch (error) {
    console.error('Error fetching content item:', error);
    return corsJsonResponse(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// PUT /api/spool/[siteId]/content/[collection]/[slug] - Update content item (draft save)
export async function PUT(
  request: NextRequest,
  { params }: { params: { siteId: string; collection: string; slug: string } }
) {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return corsJsonResponse({ error: 'API key required' }, { status: 401 });
    }

    const site = await verifySiteAccess(params.siteId, apiKey);
    if (!site) {
      return corsJsonResponse({ error: 'Invalid site or API key' }, { status: 401 });
    }

    const { data, status } = await request.json();

    if (!data) {
      return corsJsonResponse({ error: 'Data is required' }, { status: 400 });
    }

    // Get collection
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('id')
      .eq('site_id', params.siteId)
      .eq('slug', params.collection)
      .single();

    if (collectionError || !collection) {
      return corsJsonResponse({ error: 'Collection not found' }, { status: 404 });
    }

    // Update content item
    const updateData: any = {
      data,
      updated_at: new Date().toISOString()
    };

    if (status) {
      updateData.status = status;
      if (status === 'published') {
        updateData.published_at = new Date().toISOString();
      }
    }

    const { data: contentItem, error: contentError } = await supabase
      .from('content_items')
      .update(updateData)
      .eq('site_id', params.siteId)
      .eq('collection_id', collection.id)
      .eq('slug', params.slug)
      .select()
      .single();

    if (contentError) {
      console.error('Error updating content:', contentError);
      return corsJsonResponse({ error: 'Failed to update content' }, { status: 500 });
    }

    return corsJsonResponse({
      success: true,
      item: contentItem
    });

  } catch (error) {
    console.error('Error updating content:', error);
    return corsJsonResponse(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// POST /api/spool/[siteId]/content/[collection]/[slug]/publish - Publish content item with revalidation
export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string; collection: string; slug: string } }
) {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return corsJsonResponse({ error: 'API key required' }, { status: 401 });
    }

    const site = await verifySiteAccess(params.siteId, apiKey);
    if (!site) {
      return corsJsonResponse({ error: 'Invalid site or API key' }, { status: 401 });
    }

    // Get collection
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('id')
      .eq('site_id', params.siteId)
      .eq('slug', params.collection)
      .single();

    if (collectionError || !collection) {
      return corsJsonResponse({ error: 'Collection not found' }, { status: 404 });
    }

    // Publish content item
    const { data: contentItem, error: contentError } = await supabase
      .from('content_items')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('site_id', params.siteId)
      .eq('collection_id', collection.id)
      .eq('slug', params.slug)
      .select()
      .single();

    if (contentError) {
      console.error('Error publishing content:', contentError);
      return corsJsonResponse({ error: 'Failed to publish content' }, { status: 500 });
    }

    // Trigger revalidation on user's Next.js site
    if (site.domain) {
      try {
        // Call the user's revalidation endpoint
        const revalidationUrl = `${site.domain}/api/spool/revalidate`;
        await fetch(revalidationUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            paths: [
              `/${params.collection}/${params.slug}`, // Individual item
              `/${params.collection}`, // Collection index
              '/' // Homepage (might list recent content)
            ]
          })
        });
      } catch (revalidationError) {
        console.warn('Failed to trigger revalidation:', revalidationError);
        // Don't fail the publish if revalidation fails
      }
    }

    return corsJsonResponse({
      success: true,
      item: contentItem,
      revalidated: !!site.domain
    });

  } catch (error) {
    console.error('Error publishing content:', error);
    return corsJsonResponse(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/spool/[siteId]/content/[collection]/[slug] - Delete content item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { siteId: string; collection: string; slug: string } }
) {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return corsJsonResponse({ error: 'API key required' }, { status: 401 });
    }

    const site = await verifySiteAccess(params.siteId, apiKey);
    if (!site) {
      return corsJsonResponse({ error: 'Invalid site or API key' }, { status: 401 });
    }

    // Get collection
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('id')
      .eq('site_id', params.siteId)
      .eq('slug', params.collection)
      .single();

    if (collectionError || !collection) {
      return corsJsonResponse({ error: 'Collection not found' }, { status: 404 });
    }

    // Delete content item
    const { error: deleteError } = await supabase
      .from('content_items')
      .delete()
      .eq('site_id', params.siteId)
      .eq('collection_id', collection.id)
      .eq('slug', params.slug);

    if (deleteError) {
      console.error('Error deleting content:', deleteError);
      return corsJsonResponse({ error: 'Failed to delete content' }, { status: 500 });
    }

    return corsJsonResponse({
      success: true,
      message: 'Content deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting content:', error);
    return corsJsonResponse(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 