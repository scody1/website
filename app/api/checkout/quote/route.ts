import { NextRequest } from 'next/server';
import { json, readJson, route } from '@/lib/server/http';
import { quoteCart, quoteSchema } from '@/lib/server/orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Server-side price quote for the checkout (uses live DB prices, stock and coupon rules). */
export const POST = route(async (req: NextRequest) => {
  const input = await readJson(req, quoteSchema);
  return json(await quoteCart(input));
});
