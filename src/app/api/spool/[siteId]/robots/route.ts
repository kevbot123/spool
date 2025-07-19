import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSEOManager } from '@/lib/cms/seo';
import { corsJsonResponse, handleOptionsRequest, CORS_HEADERS } from '@/lib/cors';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify API key and get site
async function verifySiteAccess(siteId: string, apiKey: string) {
  const { data: site, error } = await supabase
    .from('sites')
    .select('id, user_id, api_key, name, domain')
    .eq('id', siteId)
    .eq('api_key', apiKey)
    .single();

  if (error || !site) {
    return null;
  }

  return site;
}

// OPTIONS /api/spool/[siteId]/robots - Handle preflight requests
export async function OPTIONS() {
  return handleOptionsRequest();
}

// GET /api/spool/[siteId]/robots - Generate robots.txt
export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return corsJsonResponse({ error: 'API key required' }, { status: 401 });
    }

    const site = await verifySiteAccess(params.siteId, apiKey);
    if (!site) {
      return corsJsonResponse({ error: 'Invalid site or API key' }, { status: 401 });
    }

    const siteUrl = site.domain || 'http://localhost:3000';
    const seoManager = getSEOManager(siteUrl, site.name);

    // Generate robots.txt content
    let robotsTxt = seoManager.generateRobotsTxt();

    // Update sitemap URL to point to the correct domain
    robotsTxt = robotsTxt.replace(
      `Sitemap: ${siteUrl}/sitemap.xml`,
      `Sitemap: ${siteUrl}/sitemap.xml`
    );

    return new Response(robotsTxt, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache for 24 hours
        ...CORS_HEADERS
      },
    });

  } catch (error) {
    console.error('Error generating robots.txt:', error);
    return corsJsonResponse(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 