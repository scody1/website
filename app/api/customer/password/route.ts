import { NextRequest } from 'next/server';
import { z } from 'zod';
import { assertSameOrigin, json, readJson, route } from '@/lib/server/http';
import { changeCustomerPassword, requireCustomer } from '@/lib/server/customerAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({ currentPassword: z.string().min(1).max(100), newPassword: z.string().min(1).max(100) });

/** Change password (signs out the customer's other devices). */
export const PUT = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const customer = await requireCustomer(req);
  const { currentPassword, newPassword } = await readJson(req, schema);
  await changeCustomerPassword(req, customer.id, currentPassword, newPassword);
  return json({ ok: true });
});
