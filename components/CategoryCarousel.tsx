'use client';

import React from 'react';
import { useStore } from '@/lib/storeContext';

interface CategoryCarouselProps {
  selectedCategory: string;
  onSelectCategory: (catName: string) => void;
}

export default function CategoryCarousel({ selectedCategory, onSelectCategory }: CategoryCarouselProps) {
  const { state } = useStore();

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
          onClick={() => onSelectCategory('ALL')}
          className="flex flex-col items-center flex-shrink-0 group focus:outline-none"
        >
          <div
            className={`w-18 h-18 sm:w-22 sm:h-22 rounded-full p-1 border-2 transition-all duration-300 ${
              selectedCategory === 'ALL'
                ? 'border-saffron-500 ring-4 ring-saffron-200 shadow-luxury'
                : 'border-gold-500/50 group-hover:border-gold-600 group-hover:scale-105'
            }`}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-parchment-200 border border-gold-400/40 flex items-center justify-center text-maroon-700 shadow-inner group-hover:bg-parchment-300 transition-colors">
              <span className="font-serif text-xs sm:text-sm font-extrabold text-maroon-700">ALL</span>
            </div>
          </div>
          <span
            className={`text-xs sm:text-sm font-bold mt-2 transition-colors ${
              selectedCategory === 'ALL' ? 'text-saffron-600' : 'text-espresso group-hover:text-maroon-700'
            }`}
          >
            All Items
          </span>
        </button>

        {/* Dynamic Categories */}
        {state.categories.map((cat) => {
          const isSelected = selectedCategory === cat.name;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.name)}
              className="flex flex-col items-center flex-shrink-0 group focus:outline-none"
            >
              <div
                className={`w-18 h-18 sm:w-22 sm:h-22 rounded-full p-1 border-2 transition-all duration-300 ${
                  isSelected
                    ? 'border-saffron-500 ring-4 ring-saffron-200 shadow-luxury'
                    : 'border-gold-500/50 group-hover:border-gold-600 group-hover:scale-105'
                }`}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-gold-400/60 shadow-md">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>
              <span
                className={`text-xs sm:text-sm font-bold mt-2 transition-colors max-w-[100px] text-center leading-tight ${
                  isSelected ? 'text-saffron-600' : 'text-espresso group-hover:text-maroon-700'
                }`}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
