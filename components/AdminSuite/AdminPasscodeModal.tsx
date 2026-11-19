'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { Lock, KeyRound, X } from 'lucide-react';

export default function AdminPasscodeModal() {
  const { state, setAdminUnlocked, setIsAdminOpen } = useStore();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = state.storeConfig.adminPasscode || '1234';
    if (passcode === correctPin) {
      setAdminUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setPasscode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md" />

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="w-full max-w-sm transform overflow-hidden rounded-3xl bg-white p-6 sm:p-8 text-left align-middle shadow-2xl transition-all border border-gold-500/50 relative z-10">
          
          <button
            onClick={() => setIsAdminOpen(false)}
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-maroon-700 text-gold-300 flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-serif text-xl font-bold text-maroon-700">
                Admin Management Suite
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Enter your secure Admin Passcode to access store settings, orders, and courier dispatch.
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
                    setError(false);
                  }}
                  placeholder="Enter Passcode (Default: 1234)"
                  className="w-full border-2 border-stone-300 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest text-espresso focus:border-maroon-700 focus:outline-none"
                />
                <KeyRound className="w-4 h-4 absolute right-3.5 top-4 text-stone-400" />
              </div>

              {error && (
                <p className="text-xs text-red-600 font-bold animate-shake">
                  Incorrect Passcode. Try default "1234" or check settings.
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all text-sm active:scale-98"
              >
                Unlock Control Center
              </button>

              <p className="text-[10px] text-stone-400">
                Tip: The default passcode is <strong>1234</strong>. You can change it anytime in Tab 1 (Store Setup).
              </p>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
