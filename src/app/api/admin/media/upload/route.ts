import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // Use the server client from the customized location
  const supabase = await createSupabaseRouteHandlerClient();

  // Validate user session
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Auth error:', userError);
    return NextResponse.json({ error: 'Unauthorized: Invalid session' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileExtension = file.name.split('.').pop();
    // Create a filename that is less predictable and includes a timestamp
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExtension}`;
    
    // Define the path to the public uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadsDir, fileName);

    // Ensure the uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

    // Write the file to the filesystem
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, fileBuffer);

    // Return the relative URL path
    const relativeUrl = `/uploads/${fileName}`;

    return NextResponse.json({ url: relativeUrl }, { status: 200 });

  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 });
  }
}

// Optional: Add OPTIONS method for CORS preflight requests if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust as needed for your security requirements
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
