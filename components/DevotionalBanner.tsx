'use client';

import React from 'react';
import { useStore } from '@/lib/storeContext';
import { Flame, ArrowRight, Sparkles } from 'lucide-react';

export default function DevotionalBanner() {
  const { setSelectedProductForQuickView, state } = useStore();

  const handleCampaignClick = () => {
    // Find Kamakshi Vilakku or first Deepam product
    const deepam = state.products.find((p) => p.category.includes('Deepam') || p.section === 'DEEPAM') || state.products[0];
    if (deepam) {
      setSelectedProductForQuickView(deepam);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 mt-14 sm:mt-20">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-maroon-950 via-maroon-900 to-stone-950 border-2 border-gold-500/60 shadow-2xl p-6 sm:p-12 text-parchment-100 flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Warm Temple Glow Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-saffron-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Storytelling Narrative */}
        <div className="relative z-10 max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 bg-gold-500/20 border border-gold-400/50 rounded-full px-3.5 py-1 text-xs font-bold text-gold-300 mb-4 backdrop-blur-xs">
            <Flame className="w-3.5 h-3.5 text-saffron-400" />
            <span>Sacred Cultural Movement</span>
          </div>

          <h3 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-parchment-100 leading-tight">
            "एक दिया, राम के नाम"
          </h3>
          <p className="font-serif text-lg sm:text-xl text-gold-300 mt-1 font-semibold">
            Ignite the Auspicious Flame of Dharma & Prosperity
          </p>

          <p className="mt-4 text-xs sm:text-sm text-parchment-200/90 leading-relaxed font-light">
            Every evening, lighting a consecrated pure brass oil lamp at your home entrance and family mandir invites Mahalakshmi’s grace, clears negative vastu vibrations, and restores inner peace. Join millions of devout Indian homes keeping the sacred Jyoti alive.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <button
              onClick={handleCampaignClick}
              className="bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-7 py-3 rounded-full shadow-lg hover:shadow-saffron-500/40 transition-all flex items-center gap-2 text-xs sm:text-sm group"
            >
              <span>Order Sacred Kamakshi Deepam</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <span className="text-[11px] text-gold-300/80 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-gold-400" /> Free Puja Wick Bundle Included
            </span>
          </div>
        </div>

        {/* Visual Frame */}
        <div className="relative z-10 w-full max-w-xs sm:max-w-sm flex-shrink-0">
          <div className="relative rounded-2xl overflow-hidden border-2 border-gold-400/70 shadow-2xl p-1 bg-gradient-to-b from-gold-400/30 to-maroon-700/50">
            <img
              src="https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?auto=format&fit=crop&w=700&q=80"
              alt="Sacred Brass Diya"
              className="w-full h-64 sm:h-72 object-cover rounded-xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent flex items-end p-4">
              <p className="font-serif text-xs text-gold-200 font-bold text-center w-full">
                Hand-engraved Kamakshi Temple Diya
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
