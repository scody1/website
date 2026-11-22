import { z } from 'zod';
import { db, iso } from './db';
import { ApiError } from './http';
import { audit } from './auth';
import { ALL_PERMISSIONS, isPermission, SUPER_ADMIN_ROLE, type AdminUser, type Permission, type Role } from '../shared/roles';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function mapRole(r: Row): Role {
  return {
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    permissions: r.key === SUPER_ADMIN_ROLE ? [...ALL_PERMISSIONS] : ((r.permissions || []) as string[]).filter(isPermission),
    isSystem: r.is_system,
    userCount: Number(r.user_count || 0),
    updatedAt: iso(r.updated_at)
  };
}

export async function listRoles(): Promise<Role[]> {
  const rows = await db()`
    SELECT r.*, (SELECT COUNT(*)::int FROM admin_users u WHERE u.role = r.key) AS user_count
    FROM roles r ORDER BY r.is_system DESC, r.created_at
  `;
  return rows.map(mapRole);
}

export const roleInputSchema = z.object({
  name: z.string().trim().min(2, 'Role name is required').max(60),
  description: z.string().trim().max(300).default(''),
  permissions: z.array(z.string()).max(100).transform((list) => Array.from(new Set(list)))
    .refine((list) => list.every(isPermission), 'Unknown permission in the list')
});
export type RoleInput = z.infer<typeof roleInputSchema>;

/** Non-Super-Admins may only grant permissions they have themselves. */
function assertNoEscalation(by: AdminUser, permissions: string[]) {
  if (by.role === SUPER_ADMIN_ROLE) return;
  const extra = permissions.filter((p) => !by.permissions.includes(p as Permission));
  if (extra.length) throw new ApiError(403, `You cannot grant permissions you do not have yourself (${extra.join(', ')}).`);
}

function keyFromName(name: string): string {
  const k = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'ROLE';
  return /^[A-Z]/.test(k) ? k : `R_${k}`;
}

export async function createRole(by: AdminUser, input: RoleInput): Promise<Role> {
  assertNoEscalation(by, input.permissions);
  const sql = db();
  let key = keyFromName(input.name);
  const taken = await sql`SELECT 1 FROM roles WHERE key = ${key}`;
  if (taken.length) key = `${key.slice(0, 30)}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const [row] = await sql`
    INSERT INTO roles (key, name, description, permissions)
    VALUES (${key}, ${input.name}, ${input.description}, ${input.permissions}) RETURNING *, 0 AS user_count
  `;
  await audit(by, 'role.create', `${input.name}: ${input.permissions.join(', ') || '(no permissions)'}`);
  return mapRole(row);
}

export async function updateRole(by: AdminUser, id: string, input: RoleInput): Promise<Role> {
  const sql = db();
  const [cur] = await sql`SELECT * FROM roles WHERE id = ${id}`;
  if (!cur) throw new ApiError(404, 'Role not found.');
  if (cur.key === SUPER_ADMIN_ROLE) throw new ApiError(400, 'The Super Admin role always has full access and cannot be edited.');
  if (cur.key === by.role && by.role !== SUPER_ADMIN_ROLE) throw new ApiError(403, 'You cannot edit your own role.');
  assertNoEscalation(by, input.permissions);
  const [row] = await sql`
    UPDATE roles SET name = ${input.name}, description = ${input.description}, permissions = ${input.permissions}, updated_at = now()
    WHERE id = ${id}
    RETURNING *, (SELECT COUNT(*)::int FROM admin_users u WHERE u.role = roles.key) AS user_count
  `;
  const before = new Set<string>(cur.permissions as string[]);
  const after = new Set<string>(input.permissions);
  const added = input.permissions.filter((p) => !before.has(p));
  const removed = (cur.permissions as string[]).filter((p) => !after.has(p));
  await audit(by, 'role.update', `${input.name}: +[${added.join(', ')}] −[${removed.join(', ')}]`);
  return mapRole(row);
}

export async function deleteRole(by: AdminUser, id: string): Promise<void> {
  const sql = db();
  const [cur] = await sql`SELECT r.*, (SELECT COUNT(*)::int FROM admin_users u WHERE u.role = r.key) AS user_count FROM roles r WHERE r.id = ${id}`;
  if (!cur) throw new ApiError(404, 'Role not found.');
  if (cur.key === SUPER_ADMIN_ROLE) throw new ApiError(400, 'The Super Admin role cannot be deleted.');
  if (cur.user_count > 0) throw new ApiError(400, `${cur.user_count} user(s) still have this role. Move them to another role first.`);
  if (by.role !== SUPER_ADMIN_ROLE) assertNoEscalation(by, cur.permissions as string[]);
  await sql`DELETE FROM roles WHERE id = ${id}`;
  await audit(by, 'role.delete', cur.name);
}
