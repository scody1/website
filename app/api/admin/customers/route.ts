import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { db, iso } from '@/lib/server/db';
import { json, route } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req, 'customers.view');
  const q = req.nextUrl.searchParams.get('q')?.trim();
  const search = q ? `%${q}%` : null;
  const rows = await db()`
    SELECT customer_phone AS phone,
           (ARRAY_AGG(customer_name ORDER BY created_at DESC))[1] AS name,
           (ARRAY_AGG(customer_email ORDER BY created_at DESC))[1] AS email,
           (ARRAY_AGG(city ORDER BY created_at DESC))[1] AS city,
           (ARRAY_AGG(state ORDER BY created_at DESC))[1] AS state,
           COUNT(*) FILTER (WHERE status NOT IN ('CANCELLED','PENDING_PAYMENT'))::int AS orders,
           COALESCE(SUM(total) FILTER (WHERE status NOT IN ('CANCELLED','PENDING_PAYMENT','REFUNDED')), 0)::int AS spent,
           MAX(created_at) AS last_order
    FROM orders
    WHERE (${search}::text IS NULL OR customer_name ILIKE ${search} OR customer_phone ILIKE ${search} OR customer_email ILIKE ${search})
    GROUP BY customer_phone ORDER BY MAX(created_at) DESC LIMIT 500
  `;
  return json({ customers: rows.map((r) => ({ ...r, last_order: iso(r.last_order) })) });
});
