import { NextResponse } from 'next/server';
import { readServerDb, writeServerDb } from '@/lib/serverDb';
import { broadcastSyncEvent } from './events/route';

export async function GET() {
  const data = await readServerDb();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const { key, value } = await request.json();
    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }
    await writeServerDb(key, value);
    // Broadcast the update to all active SSE subscribers
    broadcastSyncEvent({ key, value });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in POST /api/sync:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
