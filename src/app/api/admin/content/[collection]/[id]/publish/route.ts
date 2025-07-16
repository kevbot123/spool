import { NextRequest, NextResponse } from 'next/server';
import { ContentManager } from '@/lib/cms/content';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    collection: string;
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { collection, id } = await params;
    const supabase = await createSupabaseServerClient();
    const contentManager = new ContentManager(supabase);

    // Try to get the draft from the request body
    let draftPayload: any = null;
    try {
      const body = await request.json();
      draftPayload = body?.draft || body; // Support { draft: ... } or just the draft object itself
    } catch (e) {
      // Body is likely empty, which is fine
    }
    
    const publishedItem = await contentManager.publishDraftById(collection, id, draftPayload);
    
    return NextResponse.json(publishedItem);
  } catch (error: any) {
    console.error('Error publishing draft:', error);
    return NextResponse.json(
      { error: 'Failed to publish draft', details: error.message },
      { status: 500 }
    );
  }
} 