import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, json, readJson, route } from '@/lib/server/http';
import { markRazorpayPaid } from '@/lib/server/orders';
import { fetchRazorpayPayment, verifyCheckoutSignature } from '@/lib/server/razorpay';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  razorpay_order_id: z.string().min(5).max(100),
  razorpay_payment_id: z.string().min(5).max(100),
  razorpay_signature: z.string().min(10).max(200)
});

/** Called by the browser after Razorpay Checkout succeeds. */
export const POST = route(async (req: NextRequest) => {
  const body = await readJson(req, schema);
  if (!(await verifyCheckoutSignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature))) {
    throw new ApiError(400, 'Payment signature could not be verified.');
  }
  // Double-check with Razorpay that the payment really succeeded for this order.
  const payment = await fetchRazorpayPayment(body.razorpay_payment_id);
  if (payment.order_id !== body.razorpay_order_id || !['captured', 'authorized'].includes(payment.status)) {
    throw new ApiError(400, `Payment is ${payment.status}. If money was deducted it will be refunded automatically by your bank.`);
  }
  const result = await markRazorpayPaid(body.razorpay_order_id, body.razorpay_payment_id, payment.amount, 'customer');
  return json({ ok: true, ...result });
});
