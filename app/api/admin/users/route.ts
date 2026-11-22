import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createUser, listUsers, requireAdmin } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req, ['users.view', 'users.manage']);
  return json({ users: await listUsers() });
});

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email('Enter a valid email').max(200),
  role: z.string().trim().min(2).max(40),
  password: z.string().min(1).max(200)
});

/** Adds an admin account. The person must change the temporary password at first sign-in. */
export const POST = route(async (req: NextRequest) => {
  const by = await requireAdmin(req, 'users.manage');
  const input = await readJson(req, schema);
  return json({ user: await createUser(by, input) }, { status: 201 });
});
