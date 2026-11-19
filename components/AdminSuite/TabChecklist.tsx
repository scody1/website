'use client';

import React from 'react';
import { useStore } from '@/lib/storeContext';
import { CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface TabChecklistProps {
  onNavigateTab: (tabId: string) => void;
}

export default function TabChecklist({ onNavigateTab }: TabChecklistProps) {
  const { state } = useStore();

  const steps = [
    {
      id: 'step-1',
      tab: 'storeSetup',
      title: 'Store WhatsApp & Contact Setup',
      desc: state.storeConfig.whatsapp
        ? `Configured: WhatsApp +${state.storeConfig.whatsapp}`
        : 'Set your official customer support WhatsApp and phone number.',
      done: Boolean(state.storeConfig.whatsapp)
    },
    {
      id: 'step-2',
      tab: 'storeSetup',
      title: 'Courier Pickup & Legal Address Vault',
      desc: state.pickupAddress.street && state.pickupAddress.pincode
        ? `Configured: ${state.pickupAddress.city || 'Pickup Hub'} (${state.pickupAddress.pincode})`
        : 'Enter your shop/home pickup address where Shiprocket executives collect parcels.',
      done: Boolean(state.pickupAddress.street && state.pickupAddress.pincode)
    },
    {
      id: 'step-3',
      tab: 'courier',
      title: 'Shiprocket & Delhivery Courier Integration',
      desc: state.courierConfig.srEmail || state.courierConfig.srToken || state.courierConfig.dlToken
        ? 'Active: Credentials configured with automated courier booking engine.'
        : 'Connect your Shiprocket API email/password or active Bearer Token.',
      done: Boolean(state.courierConfig.srEmail || state.courierConfig.srToken || state.courierConfig.dlToken)
    },
    {
      id: 'step-4',
      tab: 'products',
      title: 'Product Catalog & Inventory Stock',
      desc: `${state.products.length} sacred items active in catalog with photos and pricing.`,
      done: state.products.length > 0
    },
    {
      id: 'step-5',
      tab: 'payments',
      title: 'Payment Gateway & Dynamic UPI QR',
      desc: state.paymentShipping.upiId || state.paymentShipping.enableCod
        ? `Configured: UPI (${state.paymentShipping.upiId || 'COD Active'})`
        : 'Configure your UPI ID for instant scan-to-pay QR codes or Razorpay API Key.',
      done: Boolean(state.paymentShipping.upiId || state.paymentShipping.enableCod)
    },
    {
      id: 'step-6',
      tab: 'payments',
      title: 'Delivery Rules & Free Shipping Threshold',
      desc: `Orders above ₹${state.paymentShipping.freeShippingThreshold} get FREE shipping. Standard fee: ₹${state.paymentShipping.standardShippingFee}.`,
      done: state.paymentShipping.freeShippingThreshold > 0
    },
    {
      id: 'step-7',
      tab: 'seo',
      title: 'Vedic SEO, GA4 & Legal Policies',
      desc: state.policiesSeo.privacyPolicy && state.policiesSeo.metaTitle
        ? 'Configured: Meta tags, JSON-LD Schema & Legal policies active.'
        : 'Review and customize your return policy and Google Analytics measurement ID.',
      done: Boolean(state.policiesSeo.privacyPolicy && state.policiesSeo.metaTitle)
    }
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-maroon-700 via-maroon-800 to-stone-900 rounded-3xl p-6 sm:p-8 text-parchment-100 border border-gold-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-gold-500/20 text-gold-300 border border-gold-400/40 px-3 py-1 rounded-full text-xs font-bold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
            <span>Store Launch Readiness</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-parchment-100">
            7-Step Dynamic Store Setup Checklist
          </h2>
          <p className="text-xs sm:text-sm text-parchment-200 mt-1 max-w-xl">
            Complete these 7 steps to configure your store from zero hardcoded assumptions. Every parameter is dynamically saved and synced.
          </p>
        </div>

        <div className="bg-stone-900/80 p-5 rounded-2xl border border-gold-500/40 text-center flex-shrink-0">
          <span className="font-serif text-4xl font-extrabold text-gold-300">{completedCount}/7</span>
          <p className="text-[11px] text-stone-400 uppercase tracking-wider font-bold mt-1">Steps Completed</p>
          <div className="w-32 bg-stone-700 h-2 rounded-full overflow-hidden mt-2 mx-auto">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / 7) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            onClick={() => onNavigateTab(step.tab)}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 group ${
              step.done
                ? 'bg-white border-emerald-300 shadow-sm hover:shadow-md'
                : 'bg-amber-50/60 border-amber-300 shadow-sm hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  Step {idx + 1}
                </span>
                <h4 className="font-serif text-sm font-bold text-maroon-700 group-hover:text-saffron-600 transition-colors">
                  {step.title}
                </h4>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>

            <button className="text-stone-400 group-hover:text-maroon-700 p-1 rounded-lg transition-colors flex-shrink-0">
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
