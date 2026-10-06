import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/session';
import { syncEventEmitter, SyncPayload } from '@/lib/sync/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    let cleanup: (() => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection packet
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED', role: auth.role, timestamp: Date.now() })}\n\n`)
        );

        const onSync = (event: SyncPayload) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          } catch {
            // Stream closed
          }
        };

        syncEventEmitter.on('sync', onSync);

        // Keepalive heartbeat comment every 20 seconds to prevent proxy / cloud timeouts
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch {
            clearInterval(heartbeat);
          }
        }, 20000);

        cleanup = () => {
          syncEventEmitter.off('sync', onSync);
          clearInterval(heartbeat);
          try {
            controller.close();
          } catch {}
        };

        req.signal.addEventListener('abort', () => {
          cleanup?.();
        });
      },
      cancel() {
        cleanup?.();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform, no-store',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
