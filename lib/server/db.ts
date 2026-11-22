import postgres from 'postgres';
import { ApiError } from './http';

declare global {
  // eslint-disable-next-line no-var
  var __rpsSql: postgres.Sql | undefined;
}

function isLocalHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Returns the shared Postgres connection pool.
 * Works with Supabase (use the "Transaction pooler" connection string on Vercel),
 * Neon, Railway or any plain Postgres 14+.
 */
export function db(): postgres.Sql {
  if (globalThis.__rpsSql) return globalThis.__rpsSql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new ApiError(503, 'Database is not configured. Set DATABASE_URL (see README).');
  }
  const sslMode = process.env.DATABASE_SSL;
  const ssl = sslMode === 'disable' || (sslMode !== 'require' && isLocalHost(url)) ? false : 'require';

  globalThis.__rpsSql = postgres(url, {
    max: Number(process.env.DB_POOL_MAX || 5),
    idle_timeout: 20,
    connect_timeout: 15,
    // Transaction-mode poolers (Supabase/pgbouncer) do not support prepared statements.
    prepare: false,
    ssl,
    onnotice: () => {}
  });
  return globalThis.__rpsSql;
}

export type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;

/** postgres.js returns NUMERIC/BIGINT as strings. */
export const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
export const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
export const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v));
export const isoOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : iso(v));
