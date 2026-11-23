import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, readJson, route } from '@/lib/server/http';
import { loginCustomer, setCustomerCookie } from '@/lib/server/customerAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  identifier: z.string().trim().min(3, 'Enter your registered mobile number or email').max(200),
  password: z.string().min(1, 'Enter your password').max(100)
});

export const POST = route(async (req: NextRequest) => {
  const { identifier, password } = await readJson(req, schema);
  const { token, customer } = await loginCustomer(req, identifier, password);
  const res = json({ ok: true, customer });
  setCustomerCookie(res, token);
  return res;
});
