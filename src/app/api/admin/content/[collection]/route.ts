import { NextRequest, NextResponse } from 'next/server';
import { getContentManager } from '@/lib/cms/content';

interface RouteParams {
  params: Promise<{
    collection: string;
  }>;
}

// GET - List all content in a collection
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { collection } = await params;
    const contentManager = getContentManager();
    const { searchParams } = new URL(request.url);
    
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;
    
    const result = await contentManager.listContent(collection, {
      limit,
      offset
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
    const contentManager = getContentManager();
    const newItem = await contentManager.createContent(collection, {
      title: 'New Item',
      slug: `new-item-${Date.now()}`,
    });
    return NextResponse.json(newItem, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create content item:', error);
    return NextResponse.json(
      { error: 'Failed to create content item', details: error.message },
      { status: 500 }
    );
  }
} 