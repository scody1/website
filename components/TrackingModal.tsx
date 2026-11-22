'use client';

import React from 'react';
import { Truck, X } from 'lucide-react';
import { useStore } from '@/lib/storeContext';
import TrackingLookup from './TrackingLookup';

export default function TrackingModal() {
  const { isTrackingModalOpen, setIsTrackingModalOpen } = useStore();
  if (!isTrackingModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn" role="dialog" aria-modal="true">
      <div className="bg-stone-900 border-2 border-gold-500/60 rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-parchment-100 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setIsTrackingModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full bg-stone-800/80 border border-stone-700 hover:border-gold-500 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-center max-w-md mx-auto mb-6">
          <div className="inline-flex items-center gap-1.5 bg-gold-500/20 text-gold-300 border border-gold-400/40 px-3 py-1 rounded-full text-xs font-bold mb-2">
            <Truck className="w-3.5 h-3.5 text-saffron-400" />
            <span>Order Tracking</span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-parchment-100">Track Your Order</h2>
          <p className="text-xs text-stone-300 mt-1">Enter your order number and the mobile number you used at checkout.</p>
        </div>
        <TrackingLookup compact />
      </div>
    </div>
  );
}
