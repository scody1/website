import { db } from '@/lib/server/db';
import { json, route } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async () => {
  await db()`SELECT 1`;
  return json({ ok: true, db: 'up', time: new Date().toISOString() });
});
