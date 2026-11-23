import { db } from './db';

/** Every migration this version of the code needs. Keep in sync with db/migrations. */
export const EXPECTED_MIGRATIONS = [
  '001_init.sql',
  '002_users_roles.sql',
  '003_product_pages_refunds_email.sql',
  '004_dynamic_roles.sql',
  '005_customer_auth.sql',
  '006_customer_hardening.sql'
];

export interface DbDiagnosis {
  ok: boolean;
  /** short machine code, e.g. AUTH_FAILED */
  code: string;
  /** what is wrong, in plain words */
  problem: string;
  /** what to do about it */
  hint: string;
  pendingMigrations?: string[];
}

/** Checks DATABASE_URL itself (before connecting). Never returns the password. */
export function checkDbUrl(url: string | undefined): DbDiagnosis | null {
  if (!url) {
    return { ok: false, code: 'NO_URL', problem: 'DATABASE_URL is not set.', hint: 'Add DATABASE_URL in Vercel → Settings → Environment Variables (or .env.local locally), then redeploy.' };
  }
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return {
      ok: false, code: 'BAD_URL', problem: 'DATABASE_URL is not a valid connection string.',
      hint: 'It must look like postgresql://USER:PASSWORD@HOST:PORT/postgres. If the password contains @ # / ? % : or spaces, URL-encode it (e.g. @ → %40, # → %23).'
    };
  }
  if (!/^postgres(ql)?:$/.test(u.protocol)) {
    return { ok: false, code: 'BAD_URL', problem: `DATABASE_URL starts with "${u.protocol}" instead of "postgresql:".`, hint: 'Copy the URI connection string from Supabase → Connect.' };
  }
  if (/\[YOUR[-_ ]PASSWORD\]|YOUR-PASSWORD/i.test(url)) {
    return { ok: false, code: 'PLACEHOLDER', problem: 'DATABASE_URL still contains the [YOUR-PASSWORD] placeholder.', hint: 'Replace it with the real database password (Supabase → Project Settings → Database → reset password if unknown).' };
  }
  if (u.hostname.endsWith('pooler.supabase.com') && !u.username.includes('.')) {
    return {
      ok: false, code: 'POOLER_USER', problem: 'Supabase pooler URL uses user "' + u.username + '" without the project ref.',
      hint: 'For the pooler the user must be postgres.<project-ref> — copy the "Transaction pooler" string from Supabase → Connect exactly.'
    };
  }
  return null;
}

/** Turns a connection/query error into a readable problem + fix. */
export function explainDbError(err: unknown): DbDiagnosis {
  const e = err as { code?: string; message?: string; errno?: string };
  const code = String(e?.code || e?.errno || '');
  const msg = String(e?.message || err);
  const out = (c: string, problem: string, hint: string): DbDiagnosis => ({ ok: false, code: c, problem, hint });

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || /getaddrinfo/i.test(msg)) {
    return out('HOST_NOT_FOUND', 'The database host name could not be found.', 'Check the host in DATABASE_URL. If you use Supabase, make sure the project is not paused or deleted (free projects pause after 7 days without use — open the Supabase dashboard and click Restore).');
  }
  if (code === 'ECONNREFUSED') return out('REFUSED', 'The database server refused the connection.', 'Check the port in DATABASE_URL (Supabase pooler: 6543 transaction mode, 5432 session mode) and that the database is running.');
  if (code === 'ETIMEDOUT' || code === 'CONNECT_TIMEOUT' || /timeout/i.test(msg)) {
    return out('TIMEOUT', 'Connecting to the database timed out.', 'The project may be paused, or the direct (IPv6-only) host is used. On Vercel use the Supabase "Transaction pooler" URL (port 6543). Also pick a region close to the server (Mumbai ap-south-1 for bom1).');
  }
  if (code === '28P01' || /password authentication failed/i.test(msg)) {
    return out('AUTH_FAILED', 'The database rejected the password.', 'Reset the database password in Supabase → Project Settings → Database, put it in DATABASE_URL (URL-encode special characters) and redeploy.');
  }
  if (/tenant or user not found/i.test(msg)) {
    return out('TENANT_NOT_FOUND', 'Supabase pooler says "Tenant or user not found".', 'The user must be postgres.<project-ref> and the pooler host must be the region of YOUR project. Copy the Transaction pooler string again from Supabase → Connect.');
  }
  if (code === '3D000') return out('NO_DATABASE', 'The database name in DATABASE_URL does not exist.', 'For Supabase the database name is "postgres" (…/postgres at the end of the URL).');
  if (code === '42P01' || /relation .* does not exist/i.test(msg)) {
    return out('NOT_MIGRATED', 'The database tables have not been created.', 'Run "npm run db:migrate" once with this DATABASE_URL (then "npm run db:seed" for starter data).');
  }
  if (code === '42703' || /column .* does not exist/i.test(msg)) {
    return out('MIGRATION_MISSING', 'The database is missing newer columns — a migration was not run.', 'Run "npm run db:migrate" with this DATABASE_URL; it only applies the missing files.');
  }
  if (/self.signed|certificate|ssl/i.test(msg)) {
    return out('SSL', 'SSL negotiation with the database failed.', 'Hosted databases need SSL (default). For a local database without SSL set DATABASE_SSL=disable.');
  }
  if (/too many (clients|connections)|remaining connection slots/i.test(msg)) {
    return out('TOO_MANY_CONNECTIONS', 'The database has too many open connections.', 'Use the Supabase Transaction pooler URL (port 6543) on Vercel and keep DB_POOL_MAX small (3–5).');
  }
  return out('UNKNOWN', `Database error: ${msg.slice(0, 200)}`, 'Run "npm run db:check" on your computer with the same DATABASE_URL to see more detail.');
}

/** Full check: URL, connection, and pending migrations. Safe to call from /api/health. */
export async function diagnoseDb(): Promise<DbDiagnosis> {
  const urlProblem = checkDbUrl(process.env.DATABASE_URL);
  if (urlProblem) return urlProblem;
  try {
    const sql = db();
    await sql`SELECT 1`;
    const [{ exists }] = await sql<{ exists: boolean }[]>`SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists`;
    if (!exists) {
      return { ok: false, code: 'NOT_MIGRATED', problem: 'Connected, but the tables have not been created.', hint: 'Run "npm run db:migrate" and "npm run db:seed" with this DATABASE_URL.', pendingMigrations: EXPECTED_MIGRATIONS };
    }
    const done = new Set((await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map((r) => r.name));
    const pending = EXPECTED_MIGRATIONS.filter((m) => !done.has(m));
    if (pending.length) {
      return {
        ok: false, code: 'MIGRATION_MISSING', problem: `Connected, but ${pending.length} database update(s) were not applied: ${pending.join(', ')}.`,
        hint: 'Run "npm run db:migrate" with this DATABASE_URL — it only applies the missing files.', pendingMigrations: pending
      };
    }
    return { ok: true, code: 'OK', problem: '', hint: '' };
  } catch (err) {
    return explainDbError(err);
  }
}
