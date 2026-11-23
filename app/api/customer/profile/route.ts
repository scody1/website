import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, json, readJson, route } from '@/lib/server/http';
import { currentCustomer, updateCustomerProfile } from '@/lib/server/customerAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  email: z.string().trim().max(200).optional(),
  addressLine1: z.string().trim().max(300).optional(),
  addressLine2: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(10).optional()
});

export const PUT = route(async (req: NextRequest) => {
  const customer = await currentCustomer(req);
  if (!customer) throw new ApiError(401, 'Please sign in to update your profile.');

  const input = await readJson(req, schema);
  const updated = await updateCustomerProfile(customer.id, input);
  return json({ ok: true, customer: updated });
});
