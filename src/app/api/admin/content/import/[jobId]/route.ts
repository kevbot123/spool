import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

/**
 * Very simple mock SSE endpoint that emits finished=true immediately. The
 * front-end will listen for "message" events. When we implement real jobs we
 * can pipe progress updates here.
 */
export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const { jobId } = params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      // send one event then close
      controller.enqueue(encoder.encode(`data: {"jobId":"${jobId}","finished":true}\n\n`));
      controller.close();
    },
  });

  // Cast stream to any to satisfy NextResponse typing differences between Node/web
  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    },
  });
}
