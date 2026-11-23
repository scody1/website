import { NextRequest } from 'next/server';
import { z } from 'zod';
import { json, readJson, route } from '@/lib/server/http';
import { registerCustomer, setCustomerCookie } from '@/lib/server/customerAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().trim().min(10, 'Enter a valid 10-digit mobile number').max(15),
  email: z.string().trim().max(200).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  addressLine1: z.string().trim().max(300).optional(),
  addressLine2: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(10).optional()
});

export const POST = route(async (req: NextRequest) => {
  const input = await readJson(req, schema);
  const { token, customer } = await registerCustomer(req, input);
  const res = json({ ok: true, customer }, { status: 201 });
  setCustomerCookie(res, token);
  return res;
});
