import { NextRequest, NextResponse } from 'next/server';
import { getContentManager } from '@/lib/cms/content';

interface RouteParams {
  params: Promise<{
    collection: string;
    id: string;
  }>;
}

// GET - Get a single content item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { collection, id } = await params;
    const contentManager = await getContentManager();
    const item = await contentManager.getContentItemById(collection, id);
    
    if (!item) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

// PUT - Update a content item
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { collection, id } = await params;
    const contentManager = await getContentManager();
    const data = await request.json();
    
    console.log('--- API Update Received ---');
    console.log('Collection:', collection);
    console.log('ID:', id);
    console.log('Received Data:', JSON.stringify(data, null, 2));
    
    const updatedItem = await contentManager.updateContentById(
      collection,
      id,
      data
    );
    
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating content:', error);
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a content item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { collection, id } = await params;
    const contentManager = await getContentManager();
    await contentManager.deleteContentById(collection, id);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting content:', error);
    if (error.code === 'ENOENT') {
      // If the file doesn't exist, it might have been already deleted.
      // Consider this a success from the client's perspective.
      return NextResponse.json({ success: true, message: 'File not found, assumed already deleted.' });
    }
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    );
  }
} 