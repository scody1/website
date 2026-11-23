import { NextRequest } from 'next/server';
import { json, route } from '@/lib/server/http';
import { clearCustomerCookie, CUSTOMER_COOKIE, logoutCustomer } from '@/lib/server/customerAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async (req: NextRequest) => {
  await logoutCustomer(req.cookies.get(CUSTOMER_COOKIE)?.value);
  const res = json({ ok: true });
  clearCustomerCookie(req, res);
  return res;
});
