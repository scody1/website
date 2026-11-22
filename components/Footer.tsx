'use client';

import React from 'react';
import Logo from './Logo';
import { useStore } from '@/lib/storeContext';
import { Phone, Mail, MapPin, Instagram, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  const { state, setActivePolicyModal } = useStore();

  return (
    <footer className="bg-stone-950 text-parchment-200 border-t-2 border-gold-500/40 mt-20 pt-14 pb-20 md:pb-12 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-12 border-b border-stone-800">
          
          {/* Col 1: Brand Info & Crest */}
          <div>
            <Logo size="lg" lightText />
            <p className="text-xs text-stone-400 mt-4 leading-relaxed font-light">
              Rajeshwar Pooja Samagri is dedicated to reviving Vedic sanctity in modern Indian households through 100% pure handcrafted brassware, consecrated temple essentials, and authentic Hawan samagri.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[11px] text-gold-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Solid Brass Guaranteed
              </span>
            </div>
          </div>

          {/* Col 2: Sacred Collections */}
          <div>
            <h4 className="font-serif text-sm font-bold text-gold-300 uppercase tracking-wider mb-4">
              Sacred Collections
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li><a href="/#catalog-sections" className="hover:text-gold-200 transition-colors">Pure Brass Idols & Murtis</a></li>
              <li><a href="/#catalog-sections" className="hover:text-gold-200 transition-colors">Oceanic Blowing & Vamavarti Shankhs</a></li>
              <li><a href="/#catalog-sections" className="hover:text-gold-200 transition-colors">Brass Kamakshi & Akhand Deepams</a></li>
              <li><a href="/#catalog-sections" className="hover:text-gold-200 transition-colors">Handcrafted Brass Urlis & Floating Bowls</a></li>
              <li><a href="/#catalog-sections" className="hover:text-gold-200 transition-colors">Cow Ghee Hawan Cups & Loban Burners</a></li>
              <li><a href="/#catalog-sections" className="hover:text-gold-200 transition-colors">Navgrah & Zodiac Balance Yantras</a></li>
            </ul>
          </div>

          {/* Col 3: Customer Care & Dispatch Hub */}
          <div>
            <h4 className="font-serif text-sm font-bold text-gold-300 uppercase tracking-wider mb-4">
              Dispatch Hub & Support
            </h4>
            <div className="space-y-3 text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
                <span>{state.storeConfig.supportPhone || '+91 98765 43210'}</span>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
                <span>{state.storeConfig.supportEmail || 'care@rajeshwarpooja.com'}</span>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-gold-400 flex-shrink-0 mt-0.5" />
                <span>
                  {state.pickupAddress.street || state.pickupAddress.city
                    ? [
                        state.pickupAddress.shopHouseNo,
                        state.pickupAddress.street,
                        state.pickupAddress.city,
                        state.pickupAddress.state,
                        state.pickupAddress.pincode
                      ].filter(Boolean).join(', ')
                    : 'Varanasi, Uttar Pradesh, India'}
                </span>
              </div>

              {state.storeConfig.instagramUrl && (
                <div className="pt-2">
                  <a
                    href={state.storeConfig.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-pink-400 hover:text-pink-300 font-semibold"
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    <span>Follow on Instagram</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Col 4: Trust & Policies */}
          <div>
            <h4 className="font-serif text-sm font-bold text-gold-300 uppercase tracking-wider mb-4">
              Legal & Trust Policies
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button
                  onClick={() => setActivePolicyModal('privacy')}
                  className="hover:text-gold-200 transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePolicyModal('terms')}
                  className="hover:text-gold-200 transition-colors text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePolicyModal('refund')}
                  className="hover:text-gold-200 transition-colors text-left"
                >
                  Return & Refund Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePolicyModal('shipping')}
                  className="hover:text-gold-200 transition-colors text-left"
                >
                  Shipping Policy
                </button>
              </li>
              <li>
                <a href="/#order-tracking-section" className="hover:text-gold-200 transition-colors">
                  Live Courier Tracking
                </a>
              </li>
            </ul>

            {/* Courier Partners Banner */}
            <div className="mt-5 p-3 rounded-xl bg-stone-900 border border-stone-800 text-[11px]">
              <span className="text-stone-400 block mb-1">Official Logistics Network:</span>
              <span className="text-emerald-400 font-bold">Shiprocket Express • Delhivery Surface</span>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>
            © {new Date().getFullYear()} {state.pickupAddress.businessLegalName || state.storeConfig.storeName}. All Rights Reserved.
          </p>
          <div className="flex items-center gap-1">
            <span>Handcrafted with Devotion</span>
            <Heart className="w-3 h-3 text-rose-600 fill-rose-600" />
            <span>for Indian Temples & Homes</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
