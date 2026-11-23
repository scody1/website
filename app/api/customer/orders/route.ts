import { NextRequest } from 'next/server';
import { ApiError, json, route } from '@/lib/server/http';
import { currentCustomer, getCustomerOrders } from '@/lib/server/customerAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  const customer = await currentCustomer(req);
  if (!customer) throw new ApiError(401, 'Please sign in to view your orders.');

  const orders = await getCustomerOrders(customer.id, customer.phone);
  return json({ orders });
});
