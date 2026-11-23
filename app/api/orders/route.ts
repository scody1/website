import { NextRequest } from 'next/server';
import { clientIp, json, readJson, route } from '@/lib/server/http';
import { checkoutSchema, createOrder } from '@/lib/server/orders';
import { currentCustomer } from '@/lib/server/customerAuth';
import { rateLimit } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Places an order. Prices, stock and coupons are re-validated inside a DB transaction. */
export const POST = route(async (req: NextRequest) => {
  await rateLimit(`order:${clientIp(req)}`, 10, 10 * 60, 'Too many orders from this device. Please wait a few minutes.');
  const input = await readJson(req, checkoutSchema);
  const customer = await currentCustomer(req);
  if (customer && !input.customerId) {
    input.customerId = customer.id;
  }
  const order = await createOrder(input);
  return json({ order }, { status: 201 });
});
