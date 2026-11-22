import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';
import { createRole, listRoles, roleInputSchema } from '@/lib/server/roles';
import { PERMISSION_MODULES } from '@/lib/shared/roles';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Roles + the permission catalogue (for the role editor and the user form). */
export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req, ['users.view', 'users.manage', 'roles.manage']);
  return json({ roles: await listRoles(), modules: PERMISSION_MODULES });
});

export const POST = route(async (req: NextRequest) => {
  const by = await requireAdmin(req, 'roles.manage');
  const input = await readJson(req, roleInputSchema);
  return json({ role: await createRole(by, input) }, { status: 201 });
});
