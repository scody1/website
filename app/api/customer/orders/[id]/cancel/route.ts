import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/server/db';
import { ApiError, assertSameOrigin, json, readJson, route } from '@/lib/server/http';
import { customerCancelOrder, customerRequestReturn, requireCustomer } from '@/lib/server/customerAuth';
import { CUSTOMER_CANCELLABLE } from '@/lib/server/cancellation';
import { rateLimit } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  reason: z.string().trim().min(2, 'Please tell us the reason.').max(500),
  upiId: z.string().trim().max(100)
    .refine((v) => v === '' || /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(v), 'Enter a valid UPI ID (name@bank)')
    .optional()
});

/**
 * Before dispatch → the order is cancelled and refunded automatically (Razorpay) or marked refund-due (UPI).
 * After dispatch  → a return/refund request is created for the store to review.
 */
export const POST = route(async (req: NextRequest, { params }: { params: { id: string } }) => {
  assertSameOrigin(req);
  const customer = await requireCustomer(req);
  await rateLimit(`customer-cancel:${customer.id}`, 10, 60 * 60);
  const input = await readJson(req, schema);
  const [o] = await db()`SELECT status, awb_code FROM orders WHERE id = ${params.id} AND customer_id = ${customer.id}`;
  if (!o) throw new ApiError(404, 'Order not found in your account.');
  const result = CUSTOMER_CANCELLABLE.includes(o.status) && !o.awb_code
    ? await customerCancelOrder(customer, params.id, input.reason, input.upiId)
    : await customerRequestReturn(customer, params.id, input.reason, input.upiId);
  return json(result);
});
