import { NextRequest } from 'next/server';
import { json, route } from '@/lib/server/http';
import { clearCustomerCookie, CUSTOMER_COOKIE, logoutCustomer } from '@/lib/server/customerAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async (req: NextRequest) => {
  const token = req.cookies.get(CUSTOMER_COOKIE)?.value;
  await logoutCustomer(token);
  const res = json({ ok: true });
  clearCustomerCookie(res);
  return res;
});
