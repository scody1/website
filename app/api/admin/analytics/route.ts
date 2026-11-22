import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { json, route } from '@/lib/server/http';
import { getAnalytics } from '@/lib/server/orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req, 'reports.sales');
  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get('days') || 30), 1), 3650);
  return json(await getAnalytics(days));
});
