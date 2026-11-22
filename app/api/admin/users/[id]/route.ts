import { z } from 'zod';
import { deleteUser, requireAdmin, updateUser } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

const schema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  role: z.string().trim().min(2).max(40).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(1).max(200).optional()
});

/** Change role, activate/deactivate, rename, or set a temporary password. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const by = await requireAdmin(req, 'users.manage');
  const patch = await readJson(req, schema);
  return json({ user: await updateUser(by, params.id, patch) });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const by = await requireAdmin(req, 'users.manage');
  await deleteUser(by, params.id);
  return json({ ok: true });
});
