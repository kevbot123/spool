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
    
    // Get all published content (not just recent updates for development)
    const { data: contentItems, error: contentError } = await supabase
      .from('content_items')
      .select(`
        id,
        slug,
        title,
        updated_at,
        collections!inner(slug)
      `)
      .eq('site_id', siteId)
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(100);
    
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
    
    // Transform data for development polling
    const updates = (contentItems || []).map(item => ({
      item_id: item.id,
      slug: item.slug,
      title: item.title,
      collection: item.collections.slug,
      updated_at: item.updated_at,
    }));
    
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