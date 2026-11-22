import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, clientIp, json, readJson, route } from '@/lib/server/http';
import { trackOrder } from '@/lib/server/orders';
import { rateLimit } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  orderNumber: z.string().trim().min(3, 'Enter your order number').max(30),
  phone: z.string().trim().min(10, 'Enter the mobile number used at checkout').max(15)
});

/** Customer order tracking. Requires BOTH the order number and the phone number. */
export const POST = route(async (req: NextRequest) => {
  await rateLimit(`track:${clientIp(req)}`, 30, 10 * 60);
  const { orderNumber, phone } = await readJson(req, schema);
  const tracking = await trackOrder(orderNumber, phone);
  if (!tracking) throw new ApiError(404, 'No order matches that order number and mobile number.');
  return json({ tracking });
});
