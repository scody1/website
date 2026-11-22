export default function SetupRequired({ reason }: { reason: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-parchment-100 p-6">
      <div className="max-w-lg w-full bg-white border border-gold-500/40 rounded-3xl p-8 shadow-lg text-espresso space-y-3">
        <h1 className="font-serif text-2xl font-bold text-maroon-700">Store setup required</h1>
        <p className="text-sm">{reason}</p>
        <ol className="text-sm list-decimal pl-5 space-y-1 text-stone-700">
          <li>Copy <code>.env.example</code> to <code>.env.local</code> and fill in <code>DATABASE_URL</code> and <code>ADMIN_PASSWORD</code>.</li>
          <li>Run <code>npm run db:migrate</code> and then <code>npm run db:seed</code>.</li>
          <li>Restart the server.</li>
        </ol>
        <p className="text-xs text-stone-500">Full instructions are in README.md.</p>
      </div>
    </main>
  );
}
