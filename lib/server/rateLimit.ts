import { db } from './db';
import { ApiError } from './http';

/**
 * Fixed-window rate limiter stored in Postgres, so it works across serverless
 * instances. Throws 429 when the limit is exceeded.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number, message?: string) {
  const sql = db();
  const [row] = await sql<{ count: number }[]>`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
                   THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
                   THEN now() ELSE rate_limits.window_start END
    RETURNING count
  `;
  if (row.count > limit) {
    throw new ApiError(429, message || 'Too many requests. Please wait a few minutes and try again.');
  }
}

export async function resetRateLimit(key: string) {
  await db()`DELETE FROM rate_limits WHERE key = ${key}`;
}
