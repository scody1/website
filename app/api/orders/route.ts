import { NextRequest } from 'next/server';
import { assertSameOrigin, clientIp, json, readJson, route } from '@/lib/server/http';
import { checkoutSchema, createOrder } from '@/lib/server/orders';
import { currentCustomer } from '@/lib/server/customerAuth';
import { rateLimit } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Places an order. Prices, stock and coupons are re-validated inside a DB transaction. */
export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  await rateLimit(`order:${clientIp(req)}`, 10, 10 * 60, 'Too many orders from this device. Please wait a few minutes.');
  const input = await readJson(req, checkoutSchema);
  // The account is taken from the login session only — never from the request body.
  const customer = await currentCustomer(req);
  const order = await createOrder(input, { customerId: customer?.id ?? null });
  return json({ order }, { status: 201 });
});
