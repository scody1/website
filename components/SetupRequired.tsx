import { diagnoseDb } from '@/lib/server/dbDiagnose';

/**
 * Shown instead of the store/admin when the database is not usable.
 * Runs a live diagnosis and tells the owner exactly what is wrong (never shows the URL or password).
 */
export default async function SetupRequired() {
  const d = await diagnoseDb();
  return (
    <main className="min-h-screen flex items-center justify-center bg-parchment-100 p-6">
      <div className="max-w-lg w-full bg-white border border-gold-500/40 rounded-3xl p-8 shadow-lg text-espresso space-y-3">
        <h1 className="font-serif text-2xl font-bold text-maroon-700">Store setup required</h1>
        {d.ok ? (
          <p className="text-sm">The database is reachable now. Please reload the page.</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-red-700">{d.problem}</p>
            <p className="text-sm bg-amber-50 border border-amber-300 rounded-xl p-3"><strong>How to fix:</strong> {d.hint}</p>
            <p className="text-[11px] text-stone-400">Error code: {d.code}</p>
          </>
        )}
        <ol className="text-sm list-decimal pl-5 space-y-1 text-stone-700">
          <li>Set <code>DATABASE_URL</code>, <code>APP_SECRET</code> and <code>ADMIN_SETUP_KEY</code> (Vercel → Settings → Environment Variables, or <code>.env.local</code>).</li>
          <li>On your computer, with the same <code>DATABASE_URL</code>, run <code>npm run db:check</code>, then <code>npm run db:migrate</code> and <code>npm run db:seed</code>.</li>
          <li>Redeploy / restart the server.</li>
        </ol>
        <p className="text-xs text-stone-500">Full instructions are in README.md.</p>
      </div>
    </main>
  );
}

/** Remembers a successful check so normal page loads do not pay for it every time. */
let healthyAt = 0;
export async function databaseReady(): Promise<boolean> {
  if (Date.now() - healthyAt < 5 * 60_000) return true;
  const d = await diagnoseDb();
  if (d.ok) healthyAt = Date.now();
  return d.ok;
}
