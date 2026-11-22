import { z } from 'zod';
import { requireAdmin } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { ApiError, json, readJson, route } from '@/lib/server/http';
import { mapCoupon } from '@/lib/server/catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req, 'coupons.manage');
  const { isActive } = await readJson(req, z.object({ isActive: z.boolean() }));
  const [row] = await db()`UPDATE coupons SET is_active = ${isActive} WHERE id = ${params.id} RETURNING *`;
  if (!row) throw new ApiError(404, 'Coupon not found.');
  return json({ coupon: mapCoupon(row) });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req, 'coupons.manage');
  await db()`DELETE FROM coupons WHERE id = ${params.id}`;
  return json({ ok: true });
});
