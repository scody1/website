import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { handleTrackingWebhook } from '@/lib/server/shipping';
import { getShiprocketWebhookToken } from '@/lib/server/integrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Shiprocket tracking webhook (Shiprocket panel → Settings → API → Webhooks).
 * URL: https://YOUR-DOMAIN/api/webhooks/tracking
 * Token: shown in Admin → Integrations (Shiprocket sends it in the x-api-key header).
 * Shiprocket rejects webhook URLs containing words like "shiprocket", which is why
 * this route is named "tracking".
 */
export async function POST(req: NextRequest) {
  const expected = await getShiprocketWebhookToken().catch(() => null);
  const given = req.headers.get('x-api-key') || '';
  if (!expected) return NextResponse.json({ error: 'Webhook token not configured' }, { status: 503 });
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true, ignored: 'invalid json' });
  }
  try {
    const result = await handleTrackingWebhook(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.warn('[tracking webhook]', (err as Error).message);
    // Always 200 so Shiprocket keeps the webhook enabled; the cron job re-syncs anyway.
    return NextResponse.json({ ok: true, error: 'processing failed' });
  }
}
