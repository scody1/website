import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { route } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Serves product images uploaded from the admin panel. Images never change, so they cache forever. */
export const GET = route(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new NextResponse('Not found', { status: 404 });
  const [img] = await db()`SELECT content_type, data FROM images WHERE id = ${params.id}`;
  if (!img) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Uint8Array(img.data as Buffer), {
    headers: {
      'Content-Type': img.content_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    }
  });
});
