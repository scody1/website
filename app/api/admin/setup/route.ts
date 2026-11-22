import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createFirstSuperAdmin, setSessionCookie } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  setupKey: z.string().min(1, 'Enter the setup key').max(200),
  name: z.string().trim().min(2, 'Enter your name').max(100),
  email: z.string().trim().email('Enter a valid email').max(200),
  password: z.string().min(1).max(200)
});

/** One-time creation of the first Super Admin. Works only while no admin accounts exist. */
export const POST = route(async (req: NextRequest) => {
  const input = await readJson(req, schema);
  const token = await createFirstSuperAdmin(req, input);
  const res = json({ ok: true }, { status: 201 });
  setSessionCookie(res, token);
  return res;
});
