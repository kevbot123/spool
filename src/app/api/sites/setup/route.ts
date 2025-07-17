import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, domain } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Site name is required' }, { status: 400 });
    }

    // Generate secure API key for the site
    const apiKey = `spool_${nanoid(32)}`;

    // Create the site in database
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert({
        name,
        domain,
        user_id: user.id,
        api_key: apiKey,
        settings: {
          created_via: 'setup_api',
          version: '1.0.0'
        }
      })
      .select()
      .single();

    if (siteError) {
      console.error('Error creating site:', siteError);
      return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
    }

    // Return site details for integration
    return NextResponse.json({
      success: true,
      site: {
        id: site.id,
        name: site.name,
        domain: site.domain,
        apiKey: site.api_key,
        setupInstructions: {
          step1: 'npm install @spoolcms/nextjs',
          step2: `Add API route to your Next.js app`,
          step3: `Set environment variables:
SPOOL_API_KEY=${site.api_key}
SPOOL_SITE_ID=${site.id}`,
          apiRoute: `// app/api/spool/[...route]/route.ts
import { createSpoolHandler } from '@spoolcms/nextjs';

export const { GET, POST, PUT, DELETE } = createSpoolHandler({
  apiKey: process.env.SPOOL_API_KEY!,
  siteId: process.env.SPOOL_SITE_ID!
});`
        }
      }
    });

  } catch (error) {
    console.error('Error in site setup:', error);
    return NextResponse.json(
      { error: 'Failed to setup site' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user's sites
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, name, domain, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (sitesError) {
      console.error('Error fetching sites:', sitesError);
      return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
    }

    return NextResponse.json({ sites });

  } catch (error) {
    console.error('Error fetching sites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sites' }, 
      { status: 500 }
    );
  }
} 