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
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }
    
    const apiKey = authHeader.replace('Bearer ', '');
    
    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
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
      return NextResponse.json({ error: 'Invalid API key or site not found' }, { status: 401 });
    }
    
    // Get recent content updates (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
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
      .gte('updated_at', fiveMinutesAgo)
      .order('updated_at', { ascending: false })
      .limit(50);
    
    if (contentError) {
      console.error('Error fetching content updates:', contentError);
      return NextResponse.json({ error: 'Failed to fetch content updates' }, { status: 500 });
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
    });
    
  } catch (error) {
    console.error('Error in content-updates endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}