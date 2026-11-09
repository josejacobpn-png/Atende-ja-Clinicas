import { NextRequest } from 'next/server';

// Keep track of active SSE connections
const clients = new Set<(data: string) => void>();

export function broadcastSyncEvent(payload: { key: string; value: any }) {
  const data = JSON.stringify(payload);
  clients.forEach((sendEvent) => {
    try {
      sendEvent(data);
    } catch (e) {
      console.error('Failed to send event to client:', e);
    }
  });
}

export async function GET(request: NextRequest) {
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Keep-alive interval to prevent connections from timing out
  const keepAliveInterval = setInterval(() => {
    try {
      writer.write(encoder.encode(': keep-alive\n\n'));
    } catch (e) {
      // Stream might already be closed, catch and ignore
    }
  }, 15000);

  const sendEvent = (data: string) => {
    try {
      writer.write(encoder.encode(`data: ${data}\n\n`));
    } catch (e) {
      console.error('Error writing event to client stream, client disconnected:', e);
      clients.delete(sendEvent);
      try {
        writer.close();
      } catch (err) {}
    }
  };

  clients.add(sendEvent);

  request.signal.addEventListener('abort', () => {
    clients.delete(sendEvent);
    clearInterval(keepAliveInterval);
    try {
      writer.close();
    } catch (err) {}
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
