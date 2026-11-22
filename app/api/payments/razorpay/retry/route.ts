import { NextRequest } from 'next/server';
import { z } from 'zod';
import { clientIp, json, readJson, route } from '@/lib/server/http';
import { getPendingRazorpay } from '@/lib/server/orders';
import { rateLimit } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({ orderNumber: z.string().trim().min(3).max(30), phone: z.string().trim().min(10).max(15) });

/** Lets a customer re-open Razorpay Checkout for an order that is still awaiting payment. */
export const POST = route(async (req: NextRequest) => {
  await rateLimit(`rzp-retry:${clientIp(req)}`, 20, 10 * 60);
  const { orderNumber, phone } = await readJson(req, schema);
  return json({ razorpay: await getPendingRazorpay(orderNumber.toUpperCase(), phone) });
});
