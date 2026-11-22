import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { addEvent, markRazorpayPaid } from '@/lib/server/orders';
import { verifyWebhookSignature } from '@/lib/server/razorpay';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Razorpay webhook (Dashboard → Settings → Webhooks).
 * URL: https://YOUR-DOMAIN/api/webhooks/razorpay — events: payment.captured, payment.failed, order.paid.
 * Secret: the webhook secret saved in Admin → Integrations (or RAZORPAY_WEBHOOK_SECRET). This makes payments reliable even if the
 * customer closes the browser before the success callback runs.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';
  if (!(await verifyWebhookSignature(raw, signature))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: { id: string; order_id: string; amount: number; error_description?: string } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const sql = db();
  const eventId = req.headers.get('x-razorpay-event-id');
  if (eventId) {
    const inserted = await sql`INSERT INTO webhook_events (id, source) VALUES (${eventId}, 'razorpay') ON CONFLICT DO NOTHING RETURNING id`;
    if (inserted.length === 0) return NextResponse.json({ ok: true, duplicate: true });
  }

  const payment = event.payload?.payment?.entity;
  try {
    if ((event.event === 'payment.captured' || event.event === 'order.paid') && payment?.order_id) {
      await markRazorpayPaid(payment.order_id, payment.id, payment.amount, 'razorpay');
    } else if (event.event === 'payment.failed' && payment?.order_id) {
      const [o] = await sql`SELECT id FROM orders WHERE razorpay_order_id = ${payment.order_id}`;
      if (o) await addEvent(sql, o.id, 'PAYMENT', `Razorpay payment attempt failed: ${payment.error_description || 'unknown reason'}.`, 'razorpay');
    }
  } catch (err) {
    // Unknown orders / mismatches are logged; respond 200 so Razorpay does not retry forever.
    console.warn('[razorpay webhook]', (err as Error).message);
  }
  return NextResponse.json({ ok: true });
}
