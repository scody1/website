import { NextRequest } from 'next/server';
import { json, route } from '@/lib/server/http';
import { currentCustomer } from '@/lib/server/customerAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  const customer = await currentCustomer(req);
  return json({ customer });
});
