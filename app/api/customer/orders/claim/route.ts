import { NextRequest } from 'next/server';
import { z } from 'zod';
import { assertSameOrigin, json, readJson, route } from '@/lib/server/http';
import { claimOrder, getCustomerOrders, requireCustomer } from '@/lib/server/customerAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  orderNumber: z.string().trim().min(3, 'Enter your order number').max(30),
  pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Enter the 6-digit delivery pincode of that order')
});

/** Add a past order (placed as a guest with this account's mobile number) to the account. */
export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const customer = await requireCustomer(req);
  const { orderNumber, pincode } = await readJson(req, schema);
  await claimOrder(req, customer, orderNumber, pincode);
  return json({ ok: true, orders: await getCustomerOrders(customer.id) });
});
