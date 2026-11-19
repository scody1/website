'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { PoliciesSeo } from '@/lib/types';
import { Save, Globe, BarChart3, FileText, CheckCircle2 } from 'lucide-react';

export default function TabSeoPolicies() {
  const { state, updatePoliciesSeo } = useStore();
  const [formData, setFormData] = useState<PoliciesSeo>({ ...state.policiesSeo });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePoliciesSeo(formData);
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      
      {/* 1. SEO & OpenGraph Configuration */}
      <div className="bg-white p-6 rounded-3xl border border-gold-500/40 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-stone-200">
          <Globe className="w-5 h-5 text-maroon-700" />
          <h3 className="font-serif text-base font-bold text-maroon-700">
            Search Engine Optimization (SEO) & Social Graph Meta Tags
          </h3>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Store Meta Title *</label>
            <input
              type="text"
              required
              value={formData.metaTitle}
              onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Meta Description *</label>
            <textarea
              rows={2}
              required
              value={formData.metaDescription}
              onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Meta Keywords (Comma-Separated)</label>
              <input
                type="text"
                value={formData.metaKeywords}
                onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">OpenGraph Social Share Image URL</label>
              <input
                type="url"
                value={formData.ogImage}
                onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Google Analytics 4 (GA4) Script Injector */}
      <div className="bg-white p-6 rounded-3xl border border-gold-500/40 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-stone-200">
          <BarChart3 className="w-5 h-5 text-saffron-600" />
          <div>
            <h3 className="font-serif text-base font-bold text-maroon-700">
              Google Analytics 4 (GA4) Event Stream
            </h3>
            <p className="text-[11px] text-stone-500">
              Automatically fires view_item, add_to_cart, begin_checkout, and purchase events.
            </p>
          </div>
        </div>

        <div className="text-xs">
          <label className="block font-semibold text-stone-700 mb-1">GA4 Measurement ID</label>
          <input
            type="text"
            value={formData.gaMeasurementId}
            onChange={(e) => setFormData({ ...formData, gaMeasurementId: e.target.value.toUpperCase() })}
            placeholder="G-XXXXXXXXXX"
            className="w-full sm:w-1/2 border border-stone-300 rounded-xl px-3 py-2 font-mono uppercase text-espresso focus:border-maroon-700 focus:outline-none"
          />
          <p className="text-[10px] text-stone-400 mt-1">
            When filled, Google Tag Manager script will dynamically attach to the storefront head.
          </p>
        </div>
      </div>

      {/* 3. Legal & Trust Policies Editor */}
      <div className="bg-white p-6 rounded-3xl border border-gold-500/40 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-stone-200">
          <FileText className="w-5 h-5 text-maroon-700" />
          <h3 className="font-serif text-base font-bold text-maroon-700">
            Legal & Customer Trust Policies
          </h3>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Privacy Policy *</label>
            <textarea
              rows={4}
              required
              value={formData.privacyPolicy}
              onChange={(e) => setFormData({ ...formData, privacyPolicy: e.target.value })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Terms & Conditions *</label>
            <textarea
              rows={4}
              required
              value={formData.termsConditions}
              onChange={(e) => setFormData({ ...formData, termsConditions: e.target.value })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Return, Refund & Shipping Policy *</label>
            <textarea
              rows={4}
              required
              value={formData.refundPolicy}
              onChange={(e) => setFormData({ ...formData, refundPolicy: e.target.value })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none font-mono text-[11px]"
            />
          </div>
        </div>

        <div className="pt-3">
          <button
            type="submit"
            className="w-full bg-maroon-700 hover:bg-maroon-800 text-parchment-100 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow transition"
          >
            <Save className="w-4 h-4 text-gold-300" />
            <span>Save SEO, Analytics & Legal Policies</span>
          </button>
        </div>
      </div>

    </form>
  );
}
