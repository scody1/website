'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/storeContext';
import { Lock, KeyRound, X, Loader2 } from 'lucide-react';

export default function AdminPasscodeModal() {
  const { setAdminUnlocked } = useStore();
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: passcode.trim() }),
        credentials: 'include'
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.token) {
          sessionStorage.setItem('admin_token', data.token);
        }
        setAdminUnlocked(true);
        setErrorMsg(null);
      } else {
        setErrorMsg(data.message || 'Incorrect Passcode. Access denied.');
        setPasscode('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setErrorMsg(`Verification error: ${msg}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md" />

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="w-full max-w-sm transform overflow-hidden rounded-3xl bg-white p-6 sm:p-8 text-left align-middle shadow-2xl transition-all border border-gold-500/50 relative z-10">
          
          <Link
            href="/"
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1 rounded-lg"
            title="Return to Storefront"
          >
            <X className="w-5 h-5" />
          </Link>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-maroon-700 text-gold-300 flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-serif text-xl font-bold text-maroon-700">
                Admin Management Suite
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Enter your secure Admin Passcode to access store controls, orders, and courier dispatch.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4 pt-2">
              <div className="relative">
                <input
                  type="password"
                  autoFocus
                  required
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Enter Admin Passcode"
                  className="w-full border-2 border-stone-300 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest text-espresso focus:border-maroon-700 focus:outline-none"
                />
                <KeyRound className="w-4 h-4 absolute right-3.5 top-4 text-stone-400" />
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 font-bold animate-shake">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full bg-saffron-500 hover:bg-saffron-600 disabled:bg-stone-400 text-white font-bold py-3 rounded-xl shadow-lg transition-all text-sm active:scale-98 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Passcode...</span>
                  </>
                ) : (
                  <span>Unlock Control Center</span>
                )}
              </button>

              <p className="text-[10px] text-stone-400">
                Protected by server-side session token verification.
              </p>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
