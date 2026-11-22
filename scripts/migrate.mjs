// Applies every db/migrations/*.sql file once, in order, each in its own transaction.
// Usage: npm run db:migrate   (reads DATABASE_URL from the environment or .env.local)
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { connectionOptions, loadEnv } from './env.mjs';

loadEnv();
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Add it to .env.local or your environment.');
  process.exit(1);
}

const sql = postgres(url, connectionOptions(url));
const dir = path.resolve(process.cwd(), 'db/migrations');

try {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await sql`ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY`;
  const done = new Set((await sql`SELECT name FROM schema_migrations`).map((r) => r.name));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  let applied = 0;
  for (const file of files) {
    if (done.has(file)) continue;
    const body = fs.readFileSync(path.join(dir, file), 'utf8');
    process.stdout.write(`Applying ${file} … `);
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
    });
    console.log('done');
    applied++;
  }
  console.log(applied ? `Applied ${applied} migration(s).` : 'Database is up to date.');
} catch (err) {
  console.error('\nMigration failed:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
