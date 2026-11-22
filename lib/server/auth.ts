import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { db, iso, isoOrNull } from './db';
import { ApiError, clientIp } from './http';
import { rateLimit, resetRateLimit } from './rateLimit';
import { dummyPasswordHash, hashPassword, passwordProblem, verifyPassword } from './crypto';
import { ALL_PERMISSIONS, isPermission, SUPER_ADMIN_ROLE, type AdminUser, type Permission } from '../shared/roles';

export const ADMIN_COOKIE = 'rps_admin';
const SESSION_HOURS = 12;
const sha256hex = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** SELECT that joins each user to their role (name + permission list). */
const USER_SELECT = (sql: ReturnType<typeof db>) => sql`
  SELECT u.*, r.name AS role_name, r.permissions AS role_permissions
  FROM admin_users u JOIN roles r ON r.key = u.role
`;

export function mapUser(r: Row): AdminUser {
  const perms: Permission[] = r.role === SUPER_ADMIN_ROLE
    ? [...ALL_PERMISSIONS] // Super Admin always has everything, including permissions added in future versions
    : ((r.role_permissions || []) as string[]).filter(isPermission);
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    roleName: r.role_name || r.role,
    permissions: perms,
    isActive: r.is_active,
    mustChangePassword: r.must_change_password,
    lastLoginAt: isoOrNull(r.last_login_at),
    createdAt: iso(r.created_at)
  };
}

// ---------------------------------------------------------------- audit log

export async function audit(user: AdminUser | null, action: string, details = '', req?: NextRequest) {
  try {
    await db()`
      INSERT INTO audit_log (user_id, user_email, action, details, ip)
      VALUES (${user?.id ?? null}, ${user?.email ?? ''}, ${action}, ${details.slice(0, 1000)}, ${req ? clientIp(req) : ''})
    `;
  } catch (err) {
    console.warn('[audit] failed', err);
  }
}

// ---------------------------------------------------------------- first-run setup

/** The one-time key needed to create the first Super Admin (prevents a stranger claiming a fresh deploy). */
function setupKey(): string | undefined {
  return process.env.ADMIN_SETUP_KEY || process.env.ADMIN_PASSWORD;
}

export async function needsFirstUser(): Promise<boolean> {
  const [{ n }] = await db()<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM admin_users`;
  return n === 0;
}

export function setupKeyProblem(): string | null {
  const k = setupKey();
  if (!k) return 'ADMIN_SETUP_KEY is not set on the server. Add it to the environment variables to create the first admin account.';
  if (k.length < 10) return 'ADMIN_SETUP_KEY must be at least 10 characters long.';
  return null;
}

export async function createFirstSuperAdmin(req: NextRequest, input: { setupKey: string; name: string; email: string; password: string }) {
  const problem = setupKeyProblem();
  if (problem) throw new ApiError(503, problem);
  await rateLimit(`admin-setup:${clientIp(req)}`, 5, 15 * 60, 'Too many attempts. Try again in 15 minutes.');
  const a = crypto.createHash('sha256').update(setupKey() as string).digest();
  const b = crypto.createHash('sha256').update(input.setupKey).digest();
  if (!crypto.timingSafeEqual(a, b)) throw new ApiError(401, 'Incorrect setup key.');
  const pwProblem = passwordProblem(input.password);
  if (pwProblem) throw new ApiError(400, pwProblem);

  const hash = await hashPassword(input.password);
  const user = await db().begin(async (tx) => {
    // Serialise so two people cannot both create the "first" admin.
    await tx`LOCK TABLE admin_users IN EXCLUSIVE MODE`;
    const [{ n }] = await tx<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM admin_users`;
    if (n > 0) throw new ApiError(409, 'An admin account already exists. Please sign in.');
    const [ins] = await tx`
      INSERT INTO admin_users (email, name, password_hash, role)
      VALUES (${input.email.trim().toLowerCase()}, ${input.name.trim()}, ${hash}, ${SUPER_ADMIN_ROLE}) RETURNING id
    `;
    const [row] = await tx`${USER_SELECT(tx as unknown as ReturnType<typeof db>)} WHERE u.id = ${ins.id}`;
    return mapUser(row);
  });
  await audit(user, 'setup.first_admin', `Created first Super Admin ${user.email}`, req);
  return createSession(req, user);
}

// ---------------------------------------------------------------- login / sessions

async function createSession(req: NextRequest, user: AdminUser): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  const sql = db();
  await sql`DELETE FROM admin_sessions WHERE expires_at < now() - interval '7 days'`;
  await sql`
    INSERT INTO admin_sessions (token_hash, user_id, ip, user_agent, expires_at)
    VALUES (${sha256hex(token)}, ${user.id}, ${clientIp(req)}, ${(req.headers.get('user-agent') || '').slice(0, 300)},
            now() + make_interval(hours => ${SESSION_HOURS}))
  `;
  await sql`UPDATE admin_users SET last_login_at = now() WHERE id = ${user.id}`;
  return token;
}

export async function loginAdmin(req: NextRequest, emailRaw: string, password: string): Promise<string> {
  const email = emailRaw.trim().toLowerCase();
  const ip = clientIp(req);
  await rateLimit(`admin-login:${ip}`, 5, 15 * 60, 'Too many login attempts. Try again in 15 minutes.');
  await rateLimit(`admin-login-user:${email}`, 10, 15 * 60, 'Too many login attempts for this account. Try again in 15 minutes.');

  const sql = db();
  const [row] = await sql`${USER_SELECT(sql)} WHERE u.email = ${email}`;
  const ok = row ? await verifyPassword(password, row.password_hash) : (await verifyPassword(password, await dummyPasswordHash()), false);
  if (!row || !ok) {
    await audit(row ? mapUser(row) : null, 'login.failed', `Failed login for ${email}`, req);
    throw new ApiError(401, 'Incorrect email or password.');
  }
  if (!row.is_active) throw new ApiError(403, 'This account has been deactivated. Ask a Super Admin to re-enable it.');
  await resetRateLimit(`admin-login:${ip}`);
  await resetRateLimit(`admin-login-user:${email}`);
  const user = mapUser(row);
  await audit(user, 'login.success', '', req);
  return createSession(req, user);
}

async function userFromToken(token: string | undefined): Promise<AdminUser | null> {
  if (!token || token.length < 20) return null;
  const [row] = await db()`
    SELECT u.*, r.name AS role_name, r.permissions AS role_permissions
    FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id JOIN roles r ON r.key = u.role
    WHERE s.token_hash = ${sha256hex(token)} AND s.revoked_at IS NULL AND s.expires_at > now() AND u.is_active
  `;
  return row ? mapUser(row) : null;
}

export async function revokeSession(token: string | undefined) {
  if (!token) return;
  await db()`UPDATE admin_sessions SET revoked_at = now() WHERE token_hash = ${sha256hex(token)}`;
}

export async function revokeAllSessions(userId: string, exceptToken?: string) {
  await db()`
    UPDATE admin_sessions SET revoked_at = now()
    WHERE user_id = ${userId} AND revoked_at IS NULL
      AND (${exceptToken ? sha256hex(exceptToken) : null}::text IS NULL OR token_hash <> ${exceptToken ? sha256hex(exceptToken) : null})
  `;
}

/** For server components (the /admin page). */
export async function currentAdmin(): Promise<AdminUser | null> {
  try {
    return await userFromToken(cookies().get(ADMIN_COOKIE)?.value);
  } catch {
    return null;
  }
}

/**
 * Guard for every admin API route. Throws 401 (not signed in), 403 (missing
 * permission / cross-site). `permission` may be a list = any of them is enough.
 * Permissions are read from the database on every request, so role edits apply instantly.
 */
export async function requireAdmin(req: NextRequest, permission?: Permission | Permission[]): Promise<AdminUser> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (origin && host) {
      let originHost = '';
      try {
        originHost = new URL(origin).host;
      } catch {
        /* ignore */
      }
      if (originHost !== host) throw new ApiError(403, 'Cross-site request blocked.');
    }
  }
  const user = await userFromToken(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!user) throw new ApiError(401, 'Your admin session has expired. Please sign in again.');
  // Temporary passwords must be replaced before anything else (only /api/admin/me and logout stay open).
  const path = req.nextUrl.pathname;
  if (user.mustChangePassword && path !== '/api/admin/me' && path !== '/api/admin/logout') {
    throw new ApiError(403, 'Please set your own password first.');
  }
  const needed = permission === undefined ? [] : Array.isArray(permission) ? permission : [permission];
  if (needed.length && !needed.some((p) => user.permissions.includes(p))) {
    throw new ApiError(403, 'Your role does not allow this action. Ask a Super Admin for access.');
  }
  return user;
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({ name: ADMIN_COOKIE, value: '', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
}

// ---------------------------------------------------------------- user management

export async function listUsers(): Promise<AdminUser[]> {
  const sql = db();
  const rows = await sql`${USER_SELECT(sql)} ORDER BY u.created_at`;
  return rows.map(mapUser);
}

async function getUser(id: string): Promise<AdminUser> {
  const sql = db();
  const [row] = await sql`${USER_SELECT(sql)} WHERE u.id = ${id}`;
  if (!row) throw new ApiError(404, 'User not found.');
  return mapUser(row);
}

/**
 * Prevents privilege escalation: someone who is not a Super Admin can only assign
 * roles whose permissions they themselves already have, and never Super Admin.
 */
async function assertCanAssignRole(by: AdminUser, roleKey: string) {
  const [role] = await db()`SELECT key, permissions FROM roles WHERE key = ${roleKey}`;
  if (!role) throw new ApiError(400, 'That role does not exist.');
  if (by.role === SUPER_ADMIN_ROLE) return;
  if (roleKey === SUPER_ADMIN_ROLE) throw new ApiError(403, 'Only a Super Admin can make someone a Super Admin.');
  const extra = (role.permissions as string[]).filter((p) => !by.permissions.includes(p as Permission));
  if (extra.length) throw new ApiError(403, `You cannot assign a role with permissions you do not have yourself (${extra.join(', ')}).`);
}

async function activeSuperAdmins(excludeId?: string): Promise<number> {
  const [{ n }] = await db()<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM admin_users
    WHERE role = 'SUPER_ADMIN' AND is_active AND (${excludeId ?? null}::uuid IS NULL OR id <> ${excludeId ?? null})
  `;
  return n;
}

export async function createUser(by: AdminUser, input: { name: string; email: string; role: string; password: string }) {
  const pwProblem = passwordProblem(input.password);
  if (pwProblem) throw new ApiError(400, pwProblem);
  await assertCanAssignRole(by, input.role);
  const [row] = await db()`
    INSERT INTO admin_users (email, name, password_hash, role, must_change_password)
    VALUES (${input.email.trim().toLowerCase()}, ${input.name.trim()}, ${await hashPassword(input.password)}, ${input.role}, true)
    RETURNING id
  `;
  const user = await getUser(row.id);
  await audit(by, 'user.create', `${user.email} as ${user.role}`);
  return user;
}

export async function updateUser(by: AdminUser, id: string, patch: { name?: string; role?: string; isActive?: boolean; password?: string }) {
  const [current] = await db()`SELECT * FROM admin_users WHERE id = ${id}`;
  if (!current) throw new ApiError(404, 'User not found.');
  if (current.role === SUPER_ADMIN_ROLE && by.role !== SUPER_ADMIN_ROLE) throw new ApiError(403, 'Only a Super Admin can change a Super Admin account.');
  if (patch.role && patch.role !== current.role) await assertCanAssignRole(by, patch.role);
  const demoting = (patch.role && patch.role !== 'SUPER_ADMIN') || patch.isActive === false;
  if (current.role === 'SUPER_ADMIN' && demoting && (await activeSuperAdmins(id)) === 0) {
    throw new ApiError(400, 'There must always be at least one active Super Admin.');
  }
  if (id === by.id && (patch.isActive === false || (patch.role && patch.role !== by.role))) {
    throw new ApiError(400, 'You cannot deactivate yourself or change your own role.');
  }
  let hash: string | null = null;
  if (patch.password !== undefined) {
    const pwProblem = passwordProblem(patch.password);
    if (pwProblem) throw new ApiError(400, pwProblem);
    hash = await hashPassword(patch.password);
  }
  const [upd] = await db()`
    UPDATE admin_users SET
      name = COALESCE(${patch.name?.trim() || null}, name),
      role = COALESCE(${patch.role ?? null}, role),
      is_active = COALESCE(${patch.isActive ?? null}, is_active),
      password_hash = COALESCE(${hash}, password_hash),
      must_change_password = CASE WHEN ${hash}::text IS NOT NULL THEN true ELSE must_change_password END,
      updated_at = now()
    WHERE id = ${id} RETURNING id
  `;
  const row = await getUser(upd.id);
  if (patch.isActive === false || hash) await revokeAllSessions(id);
  const changes = Object.keys(patch).map((k) => (k === 'password' ? 'password reset' : `${k}=${String((patch as Row)[k])}`)).join(', ');
  await audit(by, 'user.update', `${row.email}: ${changes}`);
  return row;
}

export async function deleteUser(by: AdminUser, id: string) {
  if (id === by.id) throw new ApiError(400, 'You cannot delete your own account.');
  const [u] = await db()`SELECT * FROM admin_users WHERE id = ${id}`;
  if (!u) throw new ApiError(404, 'User not found.');
  if (u.role === SUPER_ADMIN_ROLE && by.role !== SUPER_ADMIN_ROLE) throw new ApiError(403, 'Only a Super Admin can delete a Super Admin account.');
  if (u.role === 'SUPER_ADMIN' && u.is_active && (await activeSuperAdmins(id)) === 0) {
    throw new ApiError(400, 'There must always be at least one active Super Admin.');
  }
  await db()`DELETE FROM admin_users WHERE id = ${id}`;
  await audit(by, 'user.delete', u.email);
}

export async function changeOwnPassword(req: NextRequest, user: AdminUser, current: string, next: string) {
  const [row] = await db()`SELECT password_hash FROM admin_users WHERE id = ${user.id}`;
  if (!row || !(await verifyPassword(current, row.password_hash))) throw new ApiError(400, 'Your current password is incorrect.');
  const pwProblem = passwordProblem(next);
  if (pwProblem) throw new ApiError(400, pwProblem);
  if (current === next) throw new ApiError(400, 'Choose a new password that is different from the current one.');
  await db()`UPDATE admin_users SET password_hash = ${await hashPassword(next)}, must_change_password = false, updated_at = now() WHERE id = ${user.id}`;
  await revokeAllSessions(user.id, req.cookies.get(ADMIN_COOKIE)?.value);
  await audit(user, 'user.password_changed', '', req);
}
