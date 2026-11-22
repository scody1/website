'use client';

import React from 'react';
import { Truck } from 'lucide-react';
import TrackingLookup from './TrackingLookup';

export default function OrderTrackerSection() {
  return (
    <section id="order-tracking-section" className="max-w-7xl mx-auto px-3 sm:px-6 mt-14 sm:mt-20">
      <div className="bg-gradient-to-br from-stone-900 via-maroon-950 to-stone-900 border-2 border-gold-500/50 rounded-3xl p-6 sm:p-10 shadow-2xl text-parchment-100">
        <div className="text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-gold-500/20 text-gold-300 border border-gold-400/40 px-3 py-1 rounded-full text-xs font-bold mb-3">
            <Truck className="w-3.5 h-3.5 text-saffron-400" />
            <span>Pan-India Order Tracking</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-parchment-100">Track Your Pooja Parcel</h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1">
            Enter your order number (from your confirmation) and the mobile number used at checkout.
          </p>
        </div>
        <TrackingLookup />
      </div>
    </section>
  );
}
