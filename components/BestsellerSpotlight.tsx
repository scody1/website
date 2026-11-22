'use client';

import React from 'react';
import { useStore } from '@/lib/storeContext';
import { Star, CheckCircle, ShoppingBag, Zap, Sparkles } from 'lucide-react';

export default function BestsellerSpotlight() {
  const { state, addToCart, setIsCheckoutOpen } = useStore();

  // Find the designated bestseller product (or fallback to prod-1)
  const bestseller = state.products.find((p) => p.section === 'BESTSELLER' || p.isBestseller) || state.products[0];

  if (!bestseller) return null;

  const hasDiscount = bestseller.mrp > bestseller.sellingPrice && bestseller.mrp > 0;
  const discountPercent = hasDiscount ? Math.round(((bestseller.mrp - bestseller.sellingPrice) / bestseller.mrp) * 100) : 0;

  const handleBuyNow = () => {
    addToCart(bestseller, 1);
    setIsCheckoutOpen(true);
  };

  return (
    <section id="bestseller-spotlight" className="max-w-7xl mx-auto px-3 sm:px-6 mt-12 sm:mt-16">
      <div className="bg-gradient-to-br from-parchment-200 via-white to-parchment-200 border-2 border-gold-500/50 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Subtle decorative temple halo */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Product Imagery with Gold Badge */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border-2 border-gold-500/60 shadow-xl group">
              <img
                src={bestseller.images[0]}
                alt={bestseller.name}
                className="w-full h-80 sm:h-96 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {/* #1 Bestseller Maroon Badge */}
              <div className="absolute top-4 left-4 bg-maroon-700 text-parchment-100 text-xs font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg border border-gold-400 flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-gold-300" />
                <span>#1 Devotional Bestseller</span>
              </div>
              {/* Discount Ribbon */}
              <div className="absolute top-4 right-4 bg-saffron-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-md">
                {discountPercent}% OFF
              </div>
            </div>

            {/* Micro Thumbnail row if multiple images */}
            {bestseller.images.length > 1 && (
              <div className="flex gap-2 mt-3">
                {bestseller.images.slice(0, 3).map((img, idx) => (
                  <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden border border-gold-400/60 shadow-sm">
                    <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details, Benefits, Pricing & Dual CTAs */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            
            {/* Category and Rating */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-saffron-600 bg-saffron-50 border border-saffron-200 px-3 py-0.5 rounded-full">
                {bestseller.category}
              </span>
              {bestseller.reviewCount > 0 && (
                <div className="flex items-center gap-1.5 text-amber-500 text-xs sm:text-sm font-bold">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.round(bestseller.rating) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />
                    ))}
                  </div>
                  <span className="text-espresso font-extrabold">{bestseller.rating}</span>
                  <span className="text-stone-400">({bestseller.reviewCount} review{bestseller.reviewCount === 1 ? '' : 's'})</span>
                </div>
              )}
            </div>

            {/* Product Title */}
            <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold text-maroon-700 mt-3 leading-tight">
              {bestseller.name}
            </h3>

            {/* Short Narrative */}
            <p className="text-xs sm:text-sm text-espresso-muted mt-3 leading-relaxed">
              {bestseller.description}
            </p>

            {/* Bulleted Spiritual & Functional Benefits */}
            <div className="mt-5 space-y-2.5 bg-parchment-100/70 p-4 rounded-2xl border border-gold-500/30">
              <h4 className="text-xs font-bold text-maroon-700 uppercase tracking-wider">
                Vedic Sanctity & Functional Highlights:
              </h4>
              <ul className="space-y-2">
                {bestseller.spiritualBenefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-espresso">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing Breakdown */}
            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-extrabold text-maroon-700 font-serif">
                ₹{bestseller.sellingPrice}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base sm:text-lg text-stone-400 line-through">
                    ₹{bestseller.mrp}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Save ₹{bestseller.mrp - bestseller.sellingPrice} ({discountPercent}% OFF)
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Inclusive of all taxes • Ready for immediate courier dispatch
            </p>

            {/* Action Buttons: Add to Cart + 1-Click Buy Now */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => addToCart(bestseller, 1)}
                className="flex-1 bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-saffron-500/30 transition-all flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Add to Sacred Cart</span>
              </button>

              <button
                onClick={handleBuyNow}
                className="flex-1 bg-maroon-700 hover:bg-maroon-800 text-parchment-100 font-bold py-3.5 px-6 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base active:scale-95"
              >
                <Zap className="w-5 h-5 text-gold-300" />
                <span>1-Click Buy Now</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
