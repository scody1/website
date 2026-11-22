import { NextRequest } from 'next/server';
import { z } from 'zod';
import { loginAdmin, setSessionCookie } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().trim().min(3, 'Enter your email').max(200),
  password: z.string().min(1, 'Enter your password').max(200)
});

export const POST = route(async (req: NextRequest) => {
  const { email, password } = await readJson(req, schema);
  const token = await loginAdmin(req, email, password);
  const res = json({ ok: true });
  setSessionCookie(res, token);
  return res;
});
