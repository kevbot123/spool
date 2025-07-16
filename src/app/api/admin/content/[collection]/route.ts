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
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('sites')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error('No site found for user. Please create a site first.');
  }

  return data.id;
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
    const siteId = await getUserSiteId();
    
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
  request: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params;
    const supabase = await createSupabaseServerClient();
    const contentManager = new ContentManager(supabase);
    const siteId = await getUserSiteId();
    
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