'use client';

import React, { useEffect } from 'react';
import { RefreshCw, Home, AlertCircle } from 'lucide-react';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-parchment-100 text-espresso px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-maroon-700/10 border-2 border-gold-500/40 flex items-center justify-center text-maroon-700 mb-4 shadow-luxury">
        <AlertCircle className="w-8 h-8 text-saffron-600" />
      </div>
      <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-maroon-700 mb-2">
        Something went wrong
      </h1>
      <p className="text-sm text-espresso-muted max-w-md mb-6">
        We encountered a temporary issue while loading this page. Please try refreshing or return to the storefront.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="bg-maroon-700 hover:bg-maroon-800 text-parchment-100 font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
        <a
          href="/"
          className="bg-white hover:bg-parchment-200 text-maroon-700 border border-gold-500/60 font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-colors"
        >
          <Home className="w-4 h-4" /> Back to Store
        </a>
      </div>
    </div>
  );
}
