'use client';

import React from 'react';
import { Sparkles, Shield, Flame, Compass } from 'lucide-react';

export default function SpiritualBento() {
  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 mt-12 sm:mt-16">
      <div className="text-center mb-8">
        <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-saffron-600 block">
          Purity & Heritage
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-maroon-700 mt-1">
          The Rajeshwar Spiritual Ecosystem
        </h2>
        <p className="text-xs sm:text-sm text-espresso-muted max-w-xl mx-auto mt-1">
          Every sacred pooja accessory is created with traditional Vedic sanctity, artisanal mastery, and unconditional reverence.
        </p>
        <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent mx-auto mt-2" />
      </div>

      {/* 4-Card Architectural Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Card 1: 100% Pure Brassware (Span 2 on medium+) */}
        <div className="md:col-span-2 relative overflow-hidden bg-gradient-to-br from-parchment-200 via-parchment-100 to-amber-100/60 border border-gold-500/40 rounded-3xl p-6 sm:p-8 shadow-luxury group hover:shadow-luxury-hover transition-all">
          <div className="relative z-10 max-w-md">
            <div className="w-12 h-12 rounded-2xl bg-maroon-700 text-gold-200 flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <span className="inline-block bg-maroon-700/10 text-maroon-700 font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full mb-2">
              Uncompromising Metallurgical Purity
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-maroon-700">
              100% Solid Heavy-Gauge Pure Brassware
            </h3>
            <p className="text-xs sm:text-sm text-espresso-muted mt-2 leading-relaxed">
              Melted from virgin copper and zinc alloys adhering strictly to ancient Shilpa Shastra guidelines. No cheap aluminum fillers, zero cadmium or lead toxicity, and coated with an enduring anti-tarnish protective micro-shield.
            </p>
          </div>
          {/* Subtle background decorative accent */}
          <div className="absolute right-0 bottom-0 w-56 h-56 opacity-15 pointer-events-none group-hover:opacity-25 transition-opacity">
            <svg viewBox="0 0 100 100" className="w-full h-full text-gold-600 fill-current">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3"/>
              <path d="M50 5 L55 35 L85 40 L60 60 L70 90 L50 75 L30 90 L40 60 L15 40 L45 35 Z"/>
            </svg>
          </div>
        </div>

        {/* Card 2: Energized Spiritual Items */}
        <div className="relative overflow-hidden bg-gradient-to-br from-maroon-950 via-maroon-900 to-stone-950 border border-gold-500/50 rounded-3xl p-6 sm:p-8 shadow-luxury text-parchment-100 group hover:shadow-luxury-hover transition-all">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gold-500 text-maroon-950 flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="inline-block bg-gold-500/20 text-gold-300 font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full mb-2">
              Prana Pratishtha
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-parchment-100">
              Energized Spiritual Artifacts
            </h3>
            <p className="text-xs sm:text-sm text-parchment-200/80 mt-2 leading-relaxed">
              Every Shankh, Yantra, and Murti undergoes sacred purification with holy Ganga Jal and consecration mantras before parcel boxing.
            </p>
          </div>
        </div>

        {/* Card 3: Authentic Vedic Samagri */}
        <div className="relative overflow-hidden bg-gradient-to-br from-parchment-200 via-parchment-100 to-orange-100/40 border border-gold-500/40 rounded-3xl p-6 sm:p-8 shadow-luxury group hover:shadow-luxury-hover transition-all">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-saffron-500 text-white flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform">
              <Flame className="w-6 h-6 text-gold-100" />
            </div>
            <span className="inline-block bg-saffron-500/10 text-saffron-600 font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full mb-2">
              100% Natural Resins
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-maroon-700">
              Vedic Sambrani & Hawan Essentials
            </h3>
            <p className="text-xs sm:text-sm text-espresso-muted mt-2 leading-relaxed">
              Pure Gir Cow Ghee, natural Guggal, frankincense Loban crystals, and aromatic Ayurvedic herbs — completely free of toxic charcoal or chemicals.
            </p>
          </div>
        </div>

        {/* Card 4: Pan-India Safe Delivery (Span 2 on medium+) */}
        <div className="md:col-span-2 relative overflow-hidden bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 border border-gold-500/40 rounded-3xl p-6 sm:p-8 shadow-luxury text-parchment-100 group hover:shadow-luxury-hover transition-all">
          <div className="relative z-10 max-w-md">
            <div className="w-12 h-12 rounded-2xl bg-parchment-100 text-maroon-700 flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform">
              <Compass className="w-6 h-6" />
            </div>
            <span className="inline-block bg-emerald-500/20 text-emerald-400 font-bold text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full mb-2">
              Shiprocket & Delhivery Express
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-parchment-100">
              Pan-India Fragile Delivery & Safe Packaging
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 mt-2 leading-relaxed">
              Equipped with 3-tier shock-absorbing honeycomb air-cushions and sealed moisture-resistant outer wraps so your idols and lamps arrive in flawless temple-ready condition.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
