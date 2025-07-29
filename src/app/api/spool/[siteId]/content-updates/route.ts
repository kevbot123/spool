import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = params;
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        }
      });
    }
    
    const apiKey = authHeader.replace('Bearer ', '');
    
    // Create Supabase client with service role key for API access
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined; },
          set() {},
          remove() {},
        },
      }
    );
    
    // Verify API key and get site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, api_key')
      .eq('id', siteId)
      .eq('api_key', apiKey)
      .single();
    
    if (siteError || !site) {
      console.error('Site verification failed:', siteError);
      return NextResponse.json({ error: 'Invalid API key or site not found' }, { 
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        }
      });
    }
    
    // Get all content items (published and unpublished) with comprehensive data
    const { data: contentItems, error: contentError } = await supabase
      .from('content_items')
      .select(`
        id,
        slug,
        title,
        status,
        data,
        updated_at,
        published_at,
        collections!inner(slug)
      `)
      .eq('site_id', siteId)
      .order('updated_at', { ascending: false })
      .limit(200);
    
    if (contentError) {
      console.error('Error fetching content updates:', contentError);
      return NextResponse.json({ error: 'Failed to fetch content updates' }, { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        }
      });
    }
    
    // Transform data for development polling with comprehensive change detection
    const updates = (contentItems || []).map(item => {
      // Create a comprehensive hash of all content that could change
      // Handle both data.field and data.data.field structures
      const normalizedData = item.data?.data || item.data || {};
      
      const contentHash = JSON.stringify({
        title: item.title,
        slug: item.slug,
        status: item.status,
        published_at: item.published_at,
        updated_at: item.updated_at,
        // Include all data fields (description, body, custom fields, etc.)
        data: normalizedData,
      });
      
      return {
        item_id: item.id,
        slug: item.slug,
        title: item.title,
        status: item.status,
        published_at: item.published_at,
        collection: item.collections.slug,
        updated_at: item.updated_at,
        content_hash: contentHash, // This will detect any field changes
      };
    });
    
    return NextResponse.json({
      items: updates,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      }
    });
    
  } catch (error) {
    console.error('Error in content-updates endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      }
    });
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}