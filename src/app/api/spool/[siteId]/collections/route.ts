import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { corsJsonResponse, handleOptionsRequest } from '@/lib/cors';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify API key and get site
async function verifySiteAccess(siteId: string, apiKey: string) {
  const { data: site, error } = await supabase
    .from('sites')
    .select('id, user_id, api_key, name')
    .eq('id', siteId)
    .eq('api_key', apiKey)
    .single();

  if (error || !site) {
    return null;
  }

  return site;
}

// OPTIONS /api/spool/[siteId]/collections - Handle preflight requests
export async function OPTIONS() {
  return handleOptionsRequest();
}

// GET /api/spool/[siteId]/collections - Get all collections configuration
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
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

    // Get all collections for this site
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('id, name, slug, schema, description, created_at, updated_at')
      .eq('site_id', params.siteId)
      .order('created_at', { ascending: true });

    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError);
      return corsJsonResponse({ error: 'Failed to fetch collections' }, { status: 500 });
    }

    // Format collections for the frontend
    const formattedCollections = collections?.map(collection => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      schema: collection.schema,
      createdAt: collection.created_at,
      updatedAt: collection.updated_at
    })) || [];

    return corsJsonResponse({
      collections: formattedCollections,
      site: {
        id: params.siteId,
        name: site.name || 'Unknown Site'
      }
    });

  } catch (error) {
    console.error('Error in collections API:', error);
    return corsJsonResponse(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 