import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { json, readJson, route } from '@/lib/server/http';
import { mapCoupon } from '@/lib/server/catalog';
import { couponInputSchema } from '@/lib/server/coupons';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req, 'coupons.view');
  const rows = await db()`SELECT * FROM coupons ORDER BY created_at DESC`;
  return json({ coupons: rows.map(mapCoupon) });
});

export const POST = route(async (req: NextRequest) => {
  await requireAdmin(req, 'coupons.manage');
  const c = await readJson(req, couponInputSchema);
  const sql = db();
  const [row] = await sql`
    INSERT INTO coupons (code, description, discount_type, discount_value, max_discount, min_order_value, usage_limit, starts_at, expires_at, is_active)
    VALUES (${c.code}, ${c.description}, ${c.discountType}, ${c.discountValue}, ${c.maxDiscount as number | null}, ${c.minOrderValue},
            ${c.usageLimit as number | null}, ${c.startsAt as Date | null}, ${c.expiresAt as Date | null}, ${c.isActive})
    RETURNING *`;
  return json({ coupon: mapCoupon(row) }, { status: 201 });
});
