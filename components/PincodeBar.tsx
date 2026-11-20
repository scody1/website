'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { MapPin, Truck, CheckCircle2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

export default function PincodeBar() {
  const { checkPincode, pincodeResult, state } = useStore();
  const [inputVal, setInputVal] = useState('');
  const [hasChecked, setHasChecked] = useState(false);
  const [isLiveChecking, setIsLiveChecking] = useState(false);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal) return;
    const cleanPin = inputVal.replace(/\D/g, '').slice(0, 6);
    checkPincode(cleanPin);
    setHasChecked(true);

    if (cleanPin.length === 6 && state.courierConfig.srToken && state.courierConfig.execMode === 'LIVE_API') {
      setIsLiveChecking(true);
      try {
        await fetch('/api/shiprocket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check_pincode',
            token: state.courierConfig.srToken,
            pickupPincode: state.pickupAddress.pincode || '221001',
            deliveryPincode: cleanPin
          })
        });
      } catch (liveErr) {
        console.warn('Live serviceability check notice (fallback retained):', liveErr);
      } finally {
        setIsLiveChecking(false);
      }
    }
  };

  return (
    <section id="pincode-service-bar" className="max-w-7xl mx-auto px-3 sm:px-6 mt-6 sm:mt-8">
      <div className="bg-gradient-to-r from-parchment-200 via-parchment-100 to-parchment-200 border border-gold-500/40 rounded-2xl p-4 sm:p-6 shadow-luxury">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Label & Description */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-maroon-700/10 border border-maroon-700/30 flex items-center justify-center text-maroon-700 flex-shrink-0 mt-0.5">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-maroon-700 flex items-center gap-2">
                <span>Check Delivery Pincode & COD Eligibility</span>
              </h3>
              <p className="text-xs sm:text-sm text-espresso-muted">
                Enter your 6-digit postal code to check live dispatch timeline & Cash on Delivery options across India.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleCheck} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <input
                type="text"
                maxLength={6}
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value.replace(/\D/g, ''));
                  setHasChecked(false);
                }}
                placeholder="Enter 6-digit Pincode (e.g. 110001)"
                className="w-full bg-white border border-gold-500/60 focus:border-maroon-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold tracking-wider text-espresso focus:outline-none shadow-sm"
              />
              <MapPin className="w-4 h-4 absolute right-3.5 top-3 text-stone-400" />
            </div>
            <button
              type="submit"
              className="bg-maroon-700 hover:bg-maroon-800 text-parchment-100 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <span>Check Now</span>
            </button>
          </form>

        </div>

        {/* Dynamic Result Banner */}
        {hasChecked && pincodeResult && (
          <div className="mt-4 pt-4 border-t border-gold-500/30">
            {pincodeResult.isServiceable ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs sm:text-sm font-bold">
                      Delivery Available in {pincodeResult.city} ({pincodeResult.pincode})
                    </p>
                    <p className="text-xs text-emerald-800">
                      Standard dispatch in 24 hours. Estimated delivery by <strong>{pincodeResult.estimatedDeliveryDate}</strong> ({pincodeResult.estimatedDeliveryDays}-{pincodeResult.estimatedDeliveryDays + 1} days).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-400 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {pincodeResult.codAvailable ? 'COD Eligible' : 'Prepaid Only'}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-parchment-100 border border-gold-400 text-amber-900 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-saffron-600" />
                    Express Flight / Surface
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center gap-2 text-amber-900 text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{pincodeResult.message}</span>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
