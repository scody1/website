'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { X, Star, CheckCircle, ShoppingBag, Zap, Shield, Sparkles } from 'lucide-react';

export default function ProductQuickViewModal() {
  const {
    selectedProductForQuickView,
    setSelectedProductForQuickView,
    addToCart,
    setIsCheckoutOpen
  } = useStore();

  const [quantity, setQuantity] = useState(1);
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);

  if (!selectedProductForQuickView) return null;

  const prod = selectedProductForQuickView;
  const discountPercent = Math.round(((prod.mrp - prod.sellingPrice) / prod.mrp) * 100);

  const handleBuyNow = () => {
    addToCart(prod, quantity);
    setSelectedProductForQuickView(null);
    setIsCheckoutOpen(true);
  };

  const handleAddToCart = () => {
    addToCart(prod, quantity);
    setSelectedProductForQuickView(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={() => setSelectedProductForQuickView(null)}
        className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm transition-opacity"
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div className="w-full max-w-3xl transform overflow-hidden rounded-3xl bg-white text-left align-middle shadow-2xl transition-all border border-gold-500/50 relative z-10">
          
          {/* Close button */}
          <button
            onClick={() => setSelectedProductForQuickView(null)}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-parchment-200 hover:bg-stone-200 text-stone-700 flex items-center justify-center shadow transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8">
            
            {/* Left: Gallery */}
            <div>
              <div className="aspect-square rounded-2xl overflow-hidden border border-gold-400/60 shadow-md bg-parchment-100">
                <img
                  src={prod.images[selectedImgIndex] || prod.images[0]}
                  alt={prod.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Thumbnails */}
              {prod.images.length > 1 && (
                <div className="flex gap-2 mt-3">
                  {prod.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImgIndex(idx)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                        selectedImgIndex === idx ? 'border-maroon-700 ring-2 ring-gold-300' : 'border-stone-200 opacity-70'
                      }`}
                    >
                      <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Specs Pill */}
              <div className="mt-4 p-3 bg-parchment-100/70 rounded-xl border border-gold-300/40 text-[11px] text-espresso-muted space-y-1">
                <p><strong>SKU:</strong> {prod.sku}</p>
                <p><strong>Weight:</strong> {prod.weightKg} kg</p>
                <p><strong>Dimensions:</strong> {prod.dimensions.lengthCm} × {prod.dimensions.breadthCm} × {prod.dimensions.heightCm} cm</p>
              </div>
            </div>

            {/* Right: Details & Purchase */}
            <div className="flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-saffron-600 bg-saffron-50 px-2.5 py-0.5 rounded-full">
                  {prod.category}
                </span>

                <h3 className="font-serif text-xl sm:text-2xl font-bold text-maroon-700 mt-2 leading-tight">
                  {prod.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1.5 text-amber-500 text-xs mt-2 font-bold">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-espresso">{prod.rating}</span>
                  <span className="text-stone-400">({prod.reviewCount} Reviews)</span>
                </div>

                {/* Price */}
                <div className="mt-4 flex items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-maroon-700 font-serif">
                    ₹{prod.sellingPrice}
                  </span>
                  <span className="text-sm text-stone-400 line-through">
                    ₹{prod.mrp}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {discountPercent}% OFF
                  </span>
                </div>

                <p className="text-xs text-espresso-muted mt-3 leading-relaxed">
                  {prod.description}
                </p>

                {/* Spiritual Benefits List */}
                {prod.spiritualBenefits && prod.spiritualBenefits.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <p className="text-[11px] font-bold text-maroon-700 uppercase tracking-wider">
                      Key Sanctity Benefits:
                    </p>
                    {prod.spiritualBenefits.slice(0, 3).map((b, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-espresso">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-6 pt-4 border-t border-stone-100 space-y-3">
                {/* Quantity selector */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-600">Select Quantity:</span>
                  <div className="flex items-center border border-stone-300 rounded-lg bg-stone-50">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-2.5 py-1 text-stone-600 hover:bg-stone-200 rounded-l-lg font-bold"
                    >
                      -
                    </button>
                    <span className="px-3 font-bold text-espresso">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-2.5 py-1 text-stone-600 hover:bg-stone-200 rounded-r-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleAddToCart}
                    className="bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-3 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>

                  <button
                    onClick={handleBuyNow}
                    className="bg-maroon-700 hover:bg-maroon-800 text-parchment-100 font-bold py-3 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Zap className="w-4 h-4 text-gold-300" />
                    <span>Buy Now</span>
                  </button>
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
