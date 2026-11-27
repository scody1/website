'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { Category } from '@/lib/shared/types';
import { Sparkles } from 'lucide-react';

interface CategoryCarouselProps {
  selectedCategory: string;
  onSelectCategory: (catName: string) => void;
}

function CategoryCircleItem({
  cat,
  isSelected,
  onClick
}: {
  cat: Category;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { state } = useStore();
  const [imgError, setImgError] = useState(false);

  // If category image is missing or failed to load, dynamically find first product in this category
  const productInCat = state.products.find(
    (p) =>
      ((p.categoryId && p.categoryId === cat.id) ||
        (p.category && p.category.toLowerCase().trim() === cat.name.toLowerCase().trim())) &&
      p.images &&
      p.images.length > 0 &&
      p.images[0]
  );
  const fallbackProductImage = productInCat?.images?.[0];

  // Use category image if valid, otherwise fallback to product image
  const resolvedImage = !imgError && cat.image && cat.image.trim() ? cat.image.trim() : fallbackProductImage;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center flex-shrink-0 group focus:outline-none"
    >
      <div
        className={`w-18 h-18 sm:w-22 sm:h-22 rounded-full p-1 border-2 transition-all duration-300 ${
          isSelected
            ? 'border-saffron-500 ring-4 ring-saffron-200 shadow-luxury scale-105'
            : 'border-gold-500/50 group-hover:border-gold-600 group-hover:scale-105'
        }`}
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-gold-400/60 shadow-md bg-gradient-to-br from-parchment-200 to-amber-100 flex items-center justify-center">
          {resolvedImage ? (
            <img
              src={resolvedImage}
              alt={cat.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-100 via-parchment-200 to-gold-200 flex flex-col items-center justify-center p-1.5 text-center">
              <Sparkles className="w-4 h-4 text-saffron-600 mb-0.5" />
              <span className="font-serif text-[9px] sm:text-[10px] font-extrabold text-maroon-700 leading-tight line-clamp-2 px-1">
                {cat.name}
              </span>
            </div>
          )}
        </div>
      </div>
      <span
        className={`text-xs sm:text-sm font-bold mt-2 transition-colors max-w-[100px] text-center leading-tight ${
          isSelected ? 'text-saffron-600 font-extrabold' : 'text-espresso group-hover:text-maroon-700'
        }`}
      >
        {cat.name}
      </span>
    </button>
  );
}

export default function CategoryCarousel({ selectedCategory, onSelectCategory }: CategoryCarouselProps) {
  const { state } = useStore();

  const handleSelect = (catName: string) => {
    onSelectCategory(catName);
    // Smoothly scroll down to the product catalog
    if (typeof document !== 'undefined') {
      const el = document.getElementById('catalog-sections');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <section id="category-section" className="max-w-7xl mx-auto px-3 sm:px-6 mt-8 sm:mt-12">
      <div className="text-center mb-6 sm:mb-8">
        <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-saffron-600 block">
          Divine Collections
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-maroon-700 mt-1">
          Shop Sacred Essentials By Category
        </h2>
        <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent mx-auto mt-2" />
      </div>

      {/* Circular Gold-Rimmed Category Items */}
      <div className="flex items-center justify-start sm:justify-center gap-4 sm:gap-8 overflow-x-auto pb-4 pt-2 no-scrollbar px-2">
        {/* All Products Pill */}
        <button
          onClick={() => handleSelect('ALL')}
          className="flex flex-col items-center flex-shrink-0 group focus:outline-none"
        >
          <div
            className={`w-18 h-18 sm:w-22 sm:h-22 rounded-full p-1 border-2 transition-all duration-300 ${
              selectedCategory === 'ALL'
                ? 'border-saffron-500 ring-4 ring-saffron-200 shadow-luxury scale-105'
                : 'border-gold-500/50 group-hover:border-gold-600 group-hover:scale-105'
            }`}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-parchment-200 border border-gold-400/40 flex items-center justify-center text-maroon-700 shadow-inner group-hover:bg-parchment-300 transition-colors">
              <span className="font-serif text-xs sm:text-sm font-extrabold text-maroon-700">ALL</span>
            </div>
          </div>
          <span
            className={`text-xs sm:text-sm font-bold mt-2 transition-colors ${
              selectedCategory === 'ALL' ? 'text-saffron-600 font-extrabold' : 'text-espresso group-hover:text-maroon-700'
            }`}
          >
            All Items
          </span>
        </button>

        {/* Dynamic Categories */}
        {state.categories.map((cat) => (
          <CategoryCircleItem
            key={cat.id}
            cat={cat}
            isSelected={selectedCategory === cat.name}
            onClick={() => handleSelect(cat.name)}
          />
        ))}
      </div>
    </section>
  );
}
