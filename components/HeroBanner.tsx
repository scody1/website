'use client';

import React from 'react';
import { useStore } from '@/lib/storeContext';
import { ShieldCheck, Sparkles, Truck, Award, ArrowRight } from 'lucide-react';

export default function HeroBanner() {
  const { state } = useStore();

  const scrollToCatalog = () => {
    const el = document.getElementById('catalog-sections');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToBestseller = () => {
    const el = document.getElementById('bestseller-spotlight');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative bg-stone-950 text-white overflow-hidden mt-3 sm:mt-4 mx-2 sm:mx-6 rounded-3xl border border-gold-500/40 shadow-2xl">
      {/* Background Ambience with Vedic Imagery */}
      <div className="absolute inset-0 opacity-40">
        <img
          src="https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?auto=format&fit=crop&w=1600&q=80"
          alt="Temple Diya Ambience"
          className="w-full h-full object-cover object-center scale-105 transform motion-safe:animate-pulse"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-maroon-950/90 to-stone-950/70" />
      </div>

      {/* Decorative Golden Arch Silhouette */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-maroon-700/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-10 py-12 sm:py-20 flex flex-col items-center text-center">
        
        {/* Sacred Trust Pill */}
        <div className="inline-flex items-center gap-2 bg-maroon-900/80 border border-gold-500/60 rounded-full px-4 py-1.5 text-xs font-semibold text-gold-300 shadow-lg mb-6 backdrop-blur-sm animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5 text-gold-400" />
          <span>Vedic-Consecrated & 100% Solid Brass Guaranteed</span>
          <span className="w-1.5 h-1.5 rounded-full bg-saffron-500" />
        </div>

        {/* Dynamic Hero Title with Regal Serif */}
        <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-parchment-100 max-w-4xl leading-tight sm:leading-tight">
          {state.storeConfig.heroHeadline}
        </h1>

        {/* Dynamic Subheadline */}
        <p className="mt-4 sm:mt-6 text-sm sm:text-lg text-parchment-200/90 max-w-2xl font-light leading-relaxed">
          {state.storeConfig.heroSubheadline}
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={scrollToCatalog}
            className="bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-7 py-3.5 rounded-full shadow-lg hover:shadow-saffron-500/30 transition-all flex items-center gap-2 text-sm sm:text-base group"
          >
            <span>Explore Sacred Catalog</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={scrollToBestseller}
            className="bg-parchment-100/10 hover:bg-parchment-100/20 text-gold-200 border border-gold-500/60 font-semibold px-6 py-3.5 rounded-full backdrop-blur-sm transition-all text-sm sm:text-base"
          >
            View #1 Bestseller
          </button>
        </div>

        {/* Trust Badges Row */}
        <div className="mt-12 sm:mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full max-w-4xl border-t border-gold-500/30 pt-8 text-left">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-maroon-900/60 border border-gold-500/40 flex items-center justify-center text-gold-400 flex-shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-parchment-100">100% Pure Brass</h4>
              <p className="text-[11px] text-stone-400">Heavy-gauge & rustproof</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-maroon-900/60 border border-gold-500/40 flex items-center justify-center text-gold-400 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-parchment-100">Energized Items</h4>
              <p className="text-[11px] text-stone-400">Vedic mantras infused</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-maroon-900/60 border border-gold-500/40 flex items-center justify-center text-gold-400 flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-parchment-100">Express Shipping</h4>
              <p className="text-[11px] text-stone-400">Pan-India safe delivery</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-maroon-900/60 border border-gold-500/40 flex items-center justify-center text-gold-400 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-parchment-100">Zero Transit Damage</h4>
              <p className="text-[11px] text-stone-400">Triple bubble safe-pack</p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
