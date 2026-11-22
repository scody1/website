import { requireAdmin } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';
import { deleteRole, roleInputSchema, updateRole } from '@/lib/server/roles';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

/** Edit a role. Takes effect immediately for every user with this role. */
export const PUT = route<Ctx>(async (req, { params }) => {
  const by = await requireAdmin(req, 'roles.manage');
  const input = await readJson(req, roleInputSchema);
  return json({ role: await updateRole(by, params.id, input) });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  const by = await requireAdmin(req, 'roles.manage');
  await deleteRole(by, params.id);
  return json({ ok: true });
});
