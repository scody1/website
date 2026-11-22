import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/server/db';
import { clientIp, json, readJson, route } from '@/lib/server/http';
import { rateLimit } from '@/lib/server/rateLimit';
import { normalisePhone } from '@/lib/shared/format';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  productId: z.string().uuid().nullish(),
  authorName: z.string().trim().min(2, 'Enter your name').max(60),
  location: z.string().trim().max(60).default(''),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).default(''),
  comment: z.string().trim().min(5, 'Please write a few words about your experience').max(2000),
  orderNumber: z.string().trim().max(30).nullish(),
  phone: z.string().trim().max(15).nullish()
});

/**
 * Customer review submission. Reviews are hidden until an admin approves them.
 * "Verified buyer" is set only when the order number + phone match a delivered order.
 */
export const POST = route(async (req: NextRequest) => {
  await rateLimit(`review:${clientIp(req)}`, 5, 60 * 60, 'You have submitted several reviews already. Please try again later.');
  const r = await readJson(req, schema);
  const sql = db();

  let orderId: string | null = null;
  let verified = false;
  if (r.orderNumber && r.phone) {
    const ref = r.orderNumber.toUpperCase().replace(/^#/, '');
    const [o] = await sql`
      SELECT id, status FROM orders
      WHERE order_number = ${/^[0-9]+$/.test(ref) ? `RPS-${ref}` : ref} AND customer_phone = ${normalisePhone(r.phone)}
    `;
    if (o && o.status === 'DELIVERED') {
      const hasProduct = r.productId
        ? (await sql`SELECT 1 FROM order_items WHERE order_id = ${o.id} AND product_id = ${r.productId}`).length > 0
        : true;
      if (hasProduct) {
        orderId = o.id;
        verified = true;
      }
    }
  }

  if (r.productId) {
    const p = await sql`SELECT 1 FROM products WHERE id = ${r.productId}`;
    if (!p.length) r.productId = null;
  }

  await sql`
    INSERT INTO reviews (product_id, order_id, author_name, location, rating, title, comment, is_verified_buyer, is_approved)
    VALUES (${r.productId ?? null}, ${orderId}, ${r.authorName}, ${r.location}, ${r.rating}, ${r.title}, ${r.comment}, ${verified}, false)
  `;
  return json({ ok: true, verified, message: 'Thank you! Your review will appear after it is approved.' }, { status: 201 });
});
