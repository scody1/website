import React from 'react';
import Link from 'next/link';
import { Home, Search, ShoppingBag } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-parchment-100 text-espresso px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-maroon-700/10 border-2 border-gold-500/40 flex items-center justify-center text-maroon-700 mb-4 shadow-luxury">
        <ShoppingBag className="w-10 h-10 text-saffron-600" />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-saffron-700 mb-1">Rajeshwar Pooja Samagri</p>
      <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-maroon-700 mb-2">
        Product or Page Not Found
      </h1>
      <p className="text-sm text-espresso-muted max-w-md mb-6">
        The item or link you are looking for may have been moved, updated, or is no longer available.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="bg-maroon-700 hover:bg-maroon-800 text-parchment-100 font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 shadow-md transition-colors"
        >
          <Home className="w-4 h-4" /> Return to Homepage
        </Link>
        <Link
          href="/#catalog-sections"
          className="bg-white hover:bg-parchment-200 text-maroon-700 border border-gold-500/60 font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-colors"
        >
          <Search className="w-4 h-4" /> Browse All Products
        </Link>
      </div>
    </div>
  );
}
