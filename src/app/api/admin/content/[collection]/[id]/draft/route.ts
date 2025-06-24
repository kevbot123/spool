import { NextRequest, NextResponse } from 'next/server';
import { getContentManager } from '@/lib/cms/content';

interface RouteParams {
  params: Promise<{
    collection: string;
    id: string;
  }>;
}

// POST - Save draft changes for a content item
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { collection, id } = await params;
    const contentManager = await getContentManager();
    const data = await request.json();
    
    // Here we'd ideally get the user ID and store it with the draft
    // For now, we'll just save the changes.
    const updatedItem = await contentManager.updateDraftById(
      collection,
      id,
      data
    );
    
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error saving draft:', error);
    return NextResponse.json(
      { error: 'Failed to save draft' },
      { status: 500 }
    );
  }
} 