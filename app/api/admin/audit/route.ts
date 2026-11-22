import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { db, iso } from '@/lib/server/db';
import { json, route } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req, 'audit.view');
  const rows = await db()`SELECT * FROM audit_log ORDER BY created_at DESC, id DESC LIMIT 300`;
  return json({
    entries: rows.map((r) => ({ id: Number(r.id), userEmail: r.user_email, action: r.action, details: r.details, ip: r.ip, createdAt: iso(r.created_at) }))
  });
});
