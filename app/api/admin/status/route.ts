import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { json, route } from '@/lib/server/http';
import { integrationStatus } from '@/lib/server/integrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Setup checklist + alert counts. Never returns secret values. */
export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req);
  const [c] = await db()`
    SELECT
      (SELECT COUNT(*)::int FROM products WHERE is_active) AS products,
      (SELECT COUNT(*)::int FROM orders WHERE status = 'NEW') AS new_orders,
      (SELECT COUNT(*)::int FROM orders WHERE payment_status = 'AWAITING_VERIFICATION') AS awaiting_verification,
      (SELECT COUNT(*)::int FROM reviews WHERE NOT is_approved) AS pending_reviews,
      (SELECT COUNT(*)::int FROM products WHERE is_active AND stock <= 5) AS low_stock,
      (SELECT order_number FROM orders WHERE status <> 'PENDING_PAYMENT' ORDER BY updated_at DESC LIMIT 1) AS latest_active,
      (SELECT COUNT(*)::int FROM orders WHERE status <> 'PENDING_PAYMENT') AS placed_total,
      (SELECT COUNT(*)::int FROM orders WHERE status IN ('CANCELLED','RTO') AND payment_status = 'PAID' AND COALESCE(refund_amount,0) < total) AS refunds_due,
      (SELECT COUNT(*)::int FROM return_requests WHERE status = 'OPEN') AS open_returns
  `;
  const i = await integrationStatus();
  return json({
    integrations: {
      database: true,
      shiprocket: i.shiprocket.connected,
      shiprocketWebhook: i.shiprocket.webhookTokenSet,
      razorpay: i.razorpay.connected,
      razorpayWebhook: i.razorpay.webhookSecretSet,
      delhivery: i.delhivery.connected,
      email: i.email.connected,
      cron: Boolean(process.env.CRON_SECRET),
      siteUrl: process.env.SITE_URL || null
    },
    counts: {
      products: c.products,
      newOrders: c.new_orders,
      awaitingVerification: c.awaiting_verification,
      pendingReviews: c.pending_reviews,
      lowStock: c.low_stock,
      placedTotal: c.placed_total,
      refundsDue: c.refunds_due,
      openReturns: c.open_returns
    },
    latestOrder: c.latest_active || null
  });
});
