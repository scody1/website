import { diagnoseDb } from '@/lib/server/dbDiagnose';
import { json, route } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Health check. Explains database problems in plain words (never reveals the URL or password). */
export const GET = route(async () => {
  const d = await diagnoseDb();
  return json(
    d.ok
      ? { ok: true, db: 'up', time: new Date().toISOString() }
      : { ok: false, db: 'down', code: d.code, problem: d.problem, hint: d.hint, pendingMigrations: d.pendingMigrations },
    { status: d.ok ? 200 : 503 }
  );
});
