'use client';

import React from 'react';
import { useStore } from '@/lib/storeContext';
import { Home, Grid, Truck, Star, ShoppingBag, Shield } from 'lucide-react';

export default function MobileDock() {
  const {
    cart,
    setIsCartOpen,
    setIsAdminOpen,
    setIsTrackingModalOpen
  } = useStore();

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="md:hidden fixed bottom-2 inset-x-2 z-40">
      <div className="bg-parchment-100/95 backdrop-blur-md border border-gold-500/50 rounded-2xl shadow-2xl px-2 py-2 flex items-center justify-around text-espresso">
        
        {/* 1. Home */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex flex-col items-center gap-0.5 text-stone-600 hover:text-maroon-700 transition"
        >
          <Home className="w-4 h-4 text-maroon-700" />
          <span className="text-[10px] font-bold">Home</span>
        </button>

        {/* 2. Categories */}
        <button
          onClick={() => scrollToSection('category-section')}
          className="flex flex-col items-center gap-0.5 text-stone-600 hover:text-maroon-700 transition"
        >
          <Grid className="w-4 h-4 text-maroon-700" />
          <span className="text-[10px] font-bold">Categories</span>
        </button>

        {/* 3. Track Order */}
        <button
          onClick={() => setIsTrackingModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-stone-600 hover:text-maroon-700 transition"
        >
          <Truck className="w-4 h-4 text-saffron-600" />
          <span className="text-[10px] font-bold">Track</span>
        </button>

        {/* 4. Reviews */}
        <button
          onClick={() => scrollToSection('reviews-section')}
          className="flex flex-col items-center gap-0.5 text-stone-600 hover:text-maroon-700 transition"
        >
          <Star className="w-4 h-4 text-amber-500" />
          <span className="text-[10px] font-bold">Reviews</span>
        </button>

        {/* 5. Cart */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center gap-0.5 relative text-stone-600 hover:text-maroon-700 transition"
        >
          <div className="relative">
            <ShoppingBag className="w-4 h-4 text-maroon-700" />
            {totalCartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-saffron-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                {totalCartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">Cart</span>
        </button>

        {/* 6. Admin */}
        <button
          onClick={() => setIsAdminOpen(true)}
          className="flex flex-col items-center gap-0.5 text-stone-800 hover:text-maroon-700 transition"
        >
          <Shield className="w-4 h-4 text-gold-600" />
          <span className="text-[10px] font-bold">Admin</span>
        </button>

      </div>
    </div>
  );
}
