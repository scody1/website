import { NextRequest } from 'next/server';
import { json, route } from '@/lib/server/http';
import { getCustomerOrders, requireCustomer } from '@/lib/server/customerAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  const customer = await requireCustomer(req);
  return json({ orders: await getCustomerOrders(customer.id) });
});
