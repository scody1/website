'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api';
import { AuthShell, authInput } from './AdminLogin';

/** Shown once, on a fresh install, to create the first Super Admin account. */
export default function AdminSetup({ configProblem }: { configProblem: string | null }) {
  const [f, setF] = useState({ setupKey: '', name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.password !== f.confirm) return setError('The two passwords do not match.');
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/admin/setup', { method: 'POST', json: { setupKey: f.setupKey, name: f.name, email: f.email, password: f.password } });
      window.location.reload();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <AuthShell title="Welcome — first-time setup" subtitle="Create the Super Admin account. This screen appears only once.">
      {configProblem ? (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{configProblem}</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <input type="password" required value={f.setupKey} onChange={set('setupKey')} placeholder="Setup key (ADMIN_SETUP_KEY)" aria-label="Setup key" className={authInput} />
          <input required value={f.name} onChange={set('name')} placeholder="Your name" aria-label="Name" autoComplete="name" className={authInput} />
          <input type="email" required value={f.email} onChange={set('email')} placeholder="Your email" aria-label="Email" autoComplete="username" className={authInput} />
          <input type="password" required value={f.password} onChange={set('password')} placeholder="Choose a password" aria-label="Password" autoComplete="new-password" className={authInput} />
          <input type="password" required value={f.confirm} onChange={set('confirm')} placeholder="Repeat password" aria-label="Repeat password" autoComplete="new-password" className={authInput} />
          <p className="text-[10px] text-stone-500">At least 10 characters, with letters and numbers.</p>
          {error && <p className="text-xs text-red-600 font-bold" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="w-full bg-saffron-500 hover:bg-saffron-600 disabled:bg-stone-400 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Super Admin'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
