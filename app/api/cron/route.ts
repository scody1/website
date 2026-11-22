import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { route } from '@/lib/server/http';
import { expireStalePayments } from '@/lib/server/orders';
import { syncAllActiveShipments } from '@/lib/server/shipping';
import { db } from '@/lib/server/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Housekeeping, run every 30 minutes by Vercel Cron (see vercel.json) or any
 * external scheduler: `Authorization: Bearer $CRON_SECRET`.
 *  - cancels unpaid Razorpay orders and returns their stock
 *  - re-syncs Shiprocket tracking for shipments in progress (backup for webhooks)
 *  - cleans old rate-limit rows
 */
export const GET = route(async (req: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const ok = secret && given.length === secret.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const expired = await expireStalePayments();
  const tracking = await syncAllActiveShipments();
  await db()`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`;
  await db()`DELETE FROM webhook_events WHERE received_at < now() - interval '30 days'`;
  return NextResponse.json({ ok: true, expired, tracking });
});
