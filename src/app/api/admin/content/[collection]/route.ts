import { NextRequest, NextResponse } from 'next/server';
import { ContentManager } from '@/lib/cms/content';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    collection: string;
  }>;
}

// Helper function to get user's site ID
async function getUserSiteId(): Promise<string> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Authentication error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    if (!user) {
      throw new Error('User not authenticated. Please sign in.');
    }

    const { data, error } = await supabase
      .from('sites')
      .select('id, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }) // Always get the first created site for consistency
      .limit(1)
      .single();

    if (error) {
      console.error('Site lookup error:', error);
      if (error.code === 'PGRST116') {
        throw new Error(`No site found for user ${user.email || user.id}. Please create a site first.`);
      }
      throw new Error(`Failed to get user site: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`No site found for user ${user.email || user.id}. Please create a site first.`);
    }

    return data.id;
  } catch (error) {
    console.error('getUserSiteId error:', error);
    throw error;
  }
}

// GET - List all content in a collection
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { collection } = await params;
    const supabase = await createSupabaseServerClient();
    const contentManager = new ContentManager(supabase);
    const { searchParams } = new URL(request.url);
    
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
    
    // Use siteId from URL parameter if provided, otherwise get user's default site
    const urlSiteId = searchParams.get('siteId');
    const siteId = urlSiteId || await getUserSiteId();
    
    const result = await contentManager.listContent(collection, {
      limit,
      offset,
      siteId
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing content:', error);
    return NextResponse.json(
      { error: 'Failed to list content' },
      { status: 500 }
    );
  }
}

// POST - Create new content
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params;
    const supabase = await createSupabaseServerClient();
    const contentManager = new ContentManager(supabase);
    
    // Use siteId from URL parameter if provided, otherwise get user's default site
    const { searchParams } = new URL(request.url);
    const urlSiteId = searchParams.get('siteId');
    const siteId = urlSiteId || await getUserSiteId();
    
    // Generate a better default title based on collection name
    const collectionName = collection.charAt(0).toUpperCase() + collection.slice(1);
    const timestamp = new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    const newItem = await contentManager.createContent(collection, {
      title: `New ${collectionName.slice(0, -1)} - ${timestamp}`, // Remove 's' from plural
      slug: `new-${collection.toLowerCase()}-${Date.now()}`,
    }, siteId);
    
    return NextResponse.json(newItem, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create content item:', error);
    return NextResponse.json(
      { error: 'Failed to create content item', details: error.message },
      { status: 500 }
    );
  }
} 