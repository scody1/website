import { NextRequest } from 'next/server';
import { z } from 'zod';
import { clientIp, json, readJson, route } from '@/lib/server/http';
import { validateCouponPublic } from '@/lib/server/orders';
import { rateLimit } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({ code: z.string().trim().min(1).max(30), subtotal: z.coerce.number().int().min(0) });

export const POST = route(async (req: NextRequest) => {
  await rateLimit(`coupon:${clientIp(req)}`, 30, 10 * 60);
  const { code, subtotal } = await readJson(req, schema);
  return json({ coupon: await validateCouponPublic(code, subtotal) });
});
