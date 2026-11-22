import { NextRequest } from 'next/server';
import { z } from 'zod';
import { changeOwnPassword, requireAdmin } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The signed-in admin and what they are allowed to do. */
export const GET = route(async (req: NextRequest) => {
  const user = await requireAdmin(req);
  return json({ user, permissions: user.permissions });
});

const schema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(1).max(200) });

/** Change own password (also signs out the user's other devices). */
export const PUT = route(async (req: NextRequest) => {
  const user = await requireAdmin(req);
  const { currentPassword, newPassword } = await readJson(req, schema);
  await changeOwnPassword(req, user, currentPassword, newPassword);
  return json({ ok: true });
});
