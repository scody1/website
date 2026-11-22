'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, Lock, X } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-gold-500/50 relative">
        <Link href="/" className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1" title="Back to store">
          <X className="w-5 h-5" />
        </Link>
        <div className="text-center space-y-2 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-maroon-700 text-gold-300 flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-xl font-bold text-maroon-700">{title}</h1>
          <p className="text-xs text-stone-500">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export const authInput = 'w-full border-2 border-stone-300 rounded-xl px-4 py-2.5 text-sm text-espresso focus:border-maroon-700 focus:outline-none';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/admin/login', { method: 'POST', json: { email, password } });
      window.location.reload();
    } catch (err) {
      setError(errorMessage(err));
      setPassword('');
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Admin Control Center" subtitle="Sign in with your admin account.">
      <form onSubmit={submit} className="space-y-3">
        <input type="email" autoFocus autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" className={authInput} />
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password" className={authInput} />
        {error && <p className="text-xs text-red-600 font-bold" role="alert">{error}</p>}
        <button type="submit" disabled={busy} className="w-full bg-saffron-500 hover:bg-saffron-600 disabled:bg-stone-400 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign in'}
        </button>
        <p className="text-[10px] text-stone-400 text-center">Forgot your password? Ask a Super Admin to reset it.</p>
      </form>
    </AuthShell>
  );
}
