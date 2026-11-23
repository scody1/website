// npm run db:check — explains exactly why the database does or does not work.
// Never prints the password.
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { connectionOptions, loadEnv } from './env.mjs';

loadEnv();
const url = process.env.DATABASE_URL;
const fail = (problem, hint) => {
  console.error(`\n✗ ${problem}\n  → ${hint}\n`);
  process.exit(1);
};

if (!url) fail('DATABASE_URL is not set.', 'Put it in .env.local (or pass it: DATABASE_URL=... npm run db:check).');
let u;
try {
  u = new URL(url);
} catch {
  fail('DATABASE_URL is not a valid URL.', 'If the password has @ # / ? % : or spaces, URL-encode it (@ → %40, # → %23, / → %2F).');
}
if (/\[YOUR[-_ ]PASSWORD\]|YOUR-PASSWORD/i.test(url)) fail('DATABASE_URL still has the [YOUR-PASSWORD] placeholder.', 'Replace it with the real database password.');
console.log(`Host: ${u.hostname}  Port: ${u.port || 5432}  User: ${decodeURIComponent(u.username)}  Database: ${u.pathname.slice(1) || '(none)'}`);
if (u.hostname.endsWith('pooler.supabase.com') && !u.username.includes('.')) {
  fail('Supabase pooler user has no project ref.', 'The user must be postgres.<project-ref>. Copy the Transaction pooler string from Supabase → Connect.');
}

const sql = postgres(url, { ...connectionOptions(url), connect_timeout: 15 });
try {
  const [{ v }] = await sql`SELECT current_setting('server_version') AS v`;
  console.log(`✓ Connected (PostgreSQL ${v})`);
  const files = fs.readdirSync(path.resolve('db/migrations')).filter((f) => f.endsWith('.sql')).sort();
  const [{ exists }] = await sql`SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists`;
  const done = exists ? new Set((await sql`SELECT name FROM schema_migrations`).map((r) => r.name)) : new Set();
  const pending = files.filter((f) => !done.has(f));
  if (pending.length) {
    console.log(`✗ ${pending.length} migration(s) not applied: ${pending.join(', ')}`);
    console.log('  → Run: npm run db:migrate');
    process.exitCode = 1;
  } else {
    console.log(`✓ All ${files.length} migrations applied`);
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM products`;
    console.log(`✓ ${n} products in the catalogue${n === 0 ? ' (run npm run db:seed for starter data)' : ''}`);
  }
} catch (err) {
  const code = String(err.code || '');
  const msg = String(err.message || err);
  if (code === 'ENOTFOUND' || /getaddrinfo/.test(msg)) fail('Host not found.', 'Check the host. A Supabase project may be paused/deleted — open the dashboard and Restore it.');
  if (code === 'ECONNREFUSED') fail('Connection refused.', 'Check the port (Supabase pooler 6543) and that the DB is running.');
  if (code === 'CONNECT_TIMEOUT' || code === 'ETIMEDOUT' || /timeout/i.test(msg)) fail('Connection timed out.', 'Project paused, firewall, or IPv6-only direct host. Use the Supabase Transaction pooler URL.');
  if (code === '28P01') fail('Wrong database password.', 'Reset it in Supabase → Project Settings → Database and URL-encode special characters.');
  if (/tenant or user not found/i.test(msg)) fail('"Tenant or user not found" from Supabase pooler.', 'Wrong project ref in the user name or wrong region host. Copy the pooler string again.');
  if (code === '3D000') fail('Database does not exist.', 'For Supabase the database name is "postgres".');
  if (/ssl|certificate/i.test(msg)) fail('SSL error.', 'Hosted DBs need SSL (default). For a local DB without SSL set DATABASE_SSL=disable.');
  fail(`Database error: ${msg}`, 'See README → Troubleshooting.');
} finally {
  await sql.end({ timeout: 2 });
}
