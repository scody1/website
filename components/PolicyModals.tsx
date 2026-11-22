'use client';

import React from 'react';
import { useStore } from '@/lib/storeContext';
import { X, ShieldCheck, FileText, RefreshCw, Truck } from 'lucide-react';

export default function PolicyModals() {
  const { activePolicyModal, setActivePolicyModal, state } = useStore();

  if (!activePolicyModal) return null;

  const titles = {
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
    refund: 'Return & Refund Policy',
    shipping: 'Shipping Policy'
  };

  const icons = {
    privacy: ShieldCheck,
    terms: FileText,
    refund: RefreshCw,
    shipping: Truck
  };

  const Icon = icons[activePolicyModal];

  const content = {
    privacy: state.policiesSeo.privacyPolicy,
    terms: state.policiesSeo.termsConditions,
    refund: state.policiesSeo.refundPolicy,
    shipping: state.policiesSeo.shippingPolicy
  }[activePolicyModal];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={() => setActivePolicyModal(null)}
        className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm transition-opacity"
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white text-left align-middle shadow-2xl transition-all border border-gold-500/50 relative z-10">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-maroon-700 to-maroon-800 p-5 text-parchment-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Icon className="w-5 h-5 text-gold-300" />
              <div>
                <h3 className="font-serif text-lg font-bold">{titles[activePolicyModal]}</h3>
                <p className="text-[11px] text-parchment-200">
                  {state.pickupAddress.businessLegalName || state.storeConfig.storeName}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActivePolicyModal(null)}
              className="text-parchment-200 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Policy Text Body */}
          <div className="p-6 text-xs sm:text-sm text-espresso leading-relaxed max-h-[65vh] overflow-y-auto space-y-4">
            <div className="p-3 bg-parchment-100 rounded-xl border border-gold-300/40 text-[11px] text-espresso-muted">
              <p><strong>Entity:</strong> {state.pickupAddress.businessLegalName || state.storeConfig.storeName}</p>
              <p><strong>Official Contact:</strong> {state.storeConfig.supportEmail || 'support@rajeshwarpooja.com'}</p>
              <p><strong>Registered Dispatch Address:</strong> {[state.pickupAddress.street, state.pickupAddress.city, state.pickupAddress.pincode].filter(Boolean).join(', ') || 'India'}</p>
            </div>

            <div className="whitespace-pre-line text-stone-700">
              {content}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-parchment-50 border-t border-stone-200 text-right">
            <button
              onClick={() => setActivePolicyModal(null)}
              className="bg-stone-800 hover:bg-stone-900 text-parchment-100 font-bold px-5 py-2 rounded-xl text-xs transition"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
