import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// Demo API implementation that simulates @spoolcms/nextjs package behavior
// This allows testing the blog without requiring actual Spool backend

const DEMO_COLLECTIONS = {
  blog: {
    name: 'Blog Posts',
    slug: 'blog',
    schema: {
      title: { type: 'text', required: true },
      excerpt: { type: 'text', required: true },
      body: { type: 'markdown', required: true },
      author: { type: 'text', required: true },
      tags: { type: 'multiselect', required: false },
      publishedAt: { type: 'datetime', required: true },
      featured: { type: 'boolean', required: false }
    }
  }
};

const DEMO_CONTENT = [
  {
    id: '1',
    slug: 'getting-started-with-spool-cms',
    collection: 'blog',
    data: {
      title: 'Getting Started with Spool CMS',
      excerpt: 'Learn how to set up and use Spool CMS for your Next.js projects.',
      body: '# Getting Started with Spool CMS\n\nWelcome to Spool CMS!',
      author: 'Sarah Chen',
      tags: ['tutorial', 'getting-started', 'cms'],
      publishedAt: '2024-01-15T10:00:00Z',
      featured: true
    },
    status: 'published',
    createdAt: '2024-01-15T09:00:00Z',
    publishedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    slug: 'real-time-editing-features',
    collection: 'blog',
    data: {
      title: 'Real-time Editing Features',
      excerpt: 'Discover Spool\'s real-time editing capabilities.',
      body: '# Real-time Editing Features\n\nEdit content in real-time!',
      author: 'Michael Rodriguez',
      tags: ['features', 'editing', 'collaboration'],
      publishedAt: '2024-01-12T14:30:00Z',
      featured: false
    },
    status: 'published',
    createdAt: '2024-01-12T13:00:00Z',
    publishedAt: '2024-01-12T14:30:00Z'
  }
];

function parseRoute(pathname: string) {
  // Remove /demo/api/spool/ prefix
  const segments = pathname.replace('/demo/api/spool/', '').split('/');
  
  if (segments[0] === 'collections') {
    return { type: 'collections' };
  }
  
  if (segments[0] === 'content') {
    if (segments.length === 2) {
      return { type: 'content-list', collection: segments[1] };
    } else if (segments.length === 3) {
      return { type: 'content-item', collection: segments[1], slug: segments[2] };
    }
  }
  
  return { type: 'unknown' };
}

// GET - Fetch collections or content
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const route = parseRoute(url.pathname);

    // Simulate API key check
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!apiKey || apiKey === 'demo-api-key') {
      // Allow demo access
    } else {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    switch (route.type) {
      case 'collections':
        return NextResponse.json({
          collections: Object.values(DEMO_COLLECTIONS),
          site: { id: 'demo-site', name: 'Demo Site' }
        });

      case 'content-list':
        const collectionItems = DEMO_CONTENT.filter(item => 
          item.collection === route.collection && item.status === 'published'
        );
        
        return NextResponse.json({
          collection: DEMO_COLLECTIONS[route.collection as keyof typeof DEMO_COLLECTIONS],
          items: collectionItems,
          pagination: { offset: 0, limit: 50, total: collectionItems.length }
        });

      case 'content-item':
        const item = DEMO_CONTENT.find(item => 
          item.collection === route.collection && 
          item.slug === route.slug && 
          item.status === 'published'
        );
        
        if (!item) {
          return NextResponse.json({ error: 'Content not found' }, { status: 404 });
        }
        
        return NextResponse.json({
          collection: DEMO_COLLECTIONS[route.collection as keyof typeof DEMO_COLLECTIONS],
          item
        });

      default:
        return NextResponse.json({ error: 'Invalid route' }, { status: 404 });
    }

  } catch (error) {
    console.error('Demo API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create content or publish
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const route = parseRoute(url.pathname);
    
    // For demo purposes, simulate successful operations
    if (route.type === 'content-item') {
      // Simulate publish action
      const body = await request.json();
      
      // Trigger revalidation (this would happen in real implementation)
      revalidatePath(`/demo/blog/posts/${route.slug}`);
      revalidatePath('/demo/blog');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Content published successfully (demo)' 
      });
    }
    
    return NextResponse.json({ success: true, message: 'Demo operation completed' });

  } catch (error) {
    console.error('Demo API POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update content
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const route = parseRoute(url.pathname);
    
    // For demo purposes, simulate successful update
    if (route.type === 'content-item') {
      const body = await request.json();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Content updated successfully (demo)',
        item: { 
          id: 'demo-id', 
          slug: route.slug, 
          data: body.data, 
          status: body.status || 'draft',
          updatedAt: new Date().toISOString()
        }
      });
    }
    
    return NextResponse.json({ success: true, message: 'Demo update completed' });

  } catch (error) {
    console.error('Demo API PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete content
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const route = parseRoute(url.pathname);
    
    // For demo purposes, simulate successful deletion
    if (route.type === 'content-item') {
      // Trigger revalidation
      revalidatePath('/demo/blog');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Content deleted successfully (demo)' 
      });
    }
    
    return NextResponse.json({ success: true, message: 'Demo deletion completed' });

  } catch (error) {
    console.error('Demo API DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 