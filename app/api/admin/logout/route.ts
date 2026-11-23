import { NextRequest } from 'next/server';
import { ADMIN_COOKIE, clearSessionCookie, revokeSession } from '@/lib/server/auth';
import { json, route } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async (req: NextRequest) => {
  await revokeSession(req.cookies.get(ADMIN_COOKIE)?.value);
  const res = json({ ok: true });
  clearSessionCookie(req, res);
  return res;
});
