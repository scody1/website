'use client';

import React from 'react';
import { useStore } from '@/lib/storeContext';
import { Star, CheckCircle2, MessageSquarePlus, Quote } from 'lucide-react';

export default function ReviewsSection() {
  const { state, setIsReviewModalOpen } = useStore();

  const totalReviews = state.reviews.length;
  const avgRating = totalReviews > 0
    ? (state.reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : null;

  return (
    <section id="reviews-section" className="max-w-7xl mx-auto px-3 sm:px-6 mt-14 sm:mt-20">
      
      {/* Header and Rating Summary */}
      <div className="bg-parchment-200 border border-gold-500/40 rounded-3xl p-6 sm:p-10 shadow-luxury">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gold-500/30">
          <div>
            <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-saffron-600 block">
              Devotee Experiences
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-maroon-700 mt-1">
              Customer Reviews
            </h2>
            <p className="text-xs sm:text-sm text-espresso-muted mt-1">
              Honest feedback from our customers. Every review is checked before it is published.
            </p>
          </div>

          {/* Average Rating Score & Action Button */}
          <div className="flex flex-wrap items-center gap-4">
            {avgRating && (
            <div className="bg-white px-5 py-3 rounded-2xl border border-gold-400/50 shadow-sm flex items-center gap-3">
              <span className="font-serif text-3xl font-extrabold text-maroon-700">{avgRating}</span>
              <div>
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />
                  ))}
                </div>
                <span className="text-[11px] text-stone-500 font-semibold">
                  Based on {totalReviews} review{totalReviews === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            )}

            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="bg-maroon-700 hover:bg-maroon-800 text-parchment-100 font-bold px-5 py-3.5 rounded-2xl text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <MessageSquarePlus className="w-4 h-4 text-gold-300" />
              <span>Write a Review</span>
            </button>
          </div>
        </div>

        {/* Reviews Cards Wall */}
        {totalReviews === 0 && (
          <p className="mt-6 text-sm text-stone-500 text-center">No reviews yet — be the first to share your experience.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          {state.reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl p-5 border border-gold-500/30 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative"
            >
              <Quote className="w-8 h-8 text-gold-300/40 absolute top-4 right-4 pointer-events-none" />

              <div>
                {/* Rating Stars */}
                <div className="flex text-amber-400 mb-2">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                  ))}
                </div>

                {/* Review Title */}
                <h4 className="font-serif text-sm font-bold text-maroon-700 leading-snug">
                  {rev.title || 'Customer review'}
                </h4>

                {/* Comment */}
                <p className="text-xs text-espresso-muted mt-2 leading-relaxed">
                  "{rev.comment}"
                </p>

                {/* Product link tag if any */}
                {rev.productName && (
                  <span className="inline-block mt-3 text-[10px] font-bold text-saffron-600 bg-saffron-50 px-2 py-0.5 rounded">
                    Item: {rev.productName}
                  </span>
                )}
              </div>

              {/* Author & Verified Buyer Badge */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-espresso">{rev.authorName}</p>
                  <p className="text-[10px] text-stone-400">{rev.location || 'India'} • {rev.date}</p>
                </div>
                {rev.isVerifiedBuyer && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified Buyer
                  </span>
                )}
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
