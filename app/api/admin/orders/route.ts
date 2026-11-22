import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { json, route } from '@/lib/server/http';
import { listOrders } from '@/lib/server/orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req, 'orders.view');
  const p = req.nextUrl.searchParams;
  return json(await listOrders({
    status: p.get('status') || undefined,
    payment: p.get('payment') || undefined,
    q: p.get('q') || undefined,
    page: Number(p.get('page') || 1),
    pageSize: Number(p.get('pageSize') || 25)
  }));
});
