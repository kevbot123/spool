import { cleanupOldUpdates } from '@/lib/live-updates';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Simple auth check - you can make this more secure
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    await cleanupOldUpdates();
    
    return Response.json({ 
      success: true, 
      message: 'Live updates cleanup completed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Cleanup cron job failed:', error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}