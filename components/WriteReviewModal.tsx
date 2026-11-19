'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { X, Star, Send } from 'lucide-react';

export default function WriteReviewModal() {
  const { isReviewModalOpen, setIsReviewModalOpen, state, addReview } = useStore();

  const [authorName, setAuthorName] = useState('');
  const [location, setLocation] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');

  if (!isReviewModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) {
      alert('Please enter your name and feedback.');
      return;
    }

    const prod = state.products.find((p) => p.id === selectedProductId);

    addReview({
      authorName,
      location: location || 'India',
      rating,
      title: title || 'Sacred Devotional Experience',
      comment,
      productId: prod?.id,
      productName: prod?.name,
      isVerifiedBuyer: true
    });

    setIsReviewModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={() => setIsReviewModalOpen(false)}
        className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm transition-opacity"
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div className="w-full max-w-lg transform overflow-hidden rounded-3xl bg-white text-left align-middle shadow-2xl transition-all border border-gold-500/50 relative z-10">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-maroon-700 to-maroon-800 p-5 text-parchment-100 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold">Share Your Devotional Review</h3>
              <p className="text-xs text-parchment-200">Bless other devotees with your authentic experience.</p>
            </div>
            <button
              onClick={() => setIsReviewModalOpen(false)}
              className="text-parchment-200 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            
            {/* Star Rating Selector */}
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Your Sacred Rating *</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 font-bold text-sm text-espresso">{rating} out of 5 Stars</span>
              </div>
            </div>

            {/* Product Link (Optional) */}
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Select Ordered Product (Optional)</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              >
                <option value="">General Store Experience</option>
                {state.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Rameshwar Sharma"
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">City / State</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Varanasi, UP"
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Review Headline</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Authentic brass finish, arrived safely"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Your Experience & Feedback *</label>
              <textarea
                rows={3}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe the packaging, resonance, brass weight, or pooja experience..."
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-maroon-700 hover:bg-maroon-800 text-parchment-100 font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                <Send className="w-4 h-4 text-gold-300" />
                <span>Submit Devotional Review</span>
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
}
