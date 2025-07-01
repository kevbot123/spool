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

// DELETE - Clear the draft for a content item (revert to live version)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { collection, id } = await params;
    const contentManager = await getContentManager();

    // The content manager should have a method to delete/reset the draft data.
    // We'll assume `clearDraftById` returns the updated item (without draft).
    const updatedItem = await contentManager.clearDraftById(collection, id);

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    console.error('Error clearing draft:', error);
    return NextResponse.json(
      { error: 'Failed to clear draft' },
      { status: 500 }
    );
  }
} 