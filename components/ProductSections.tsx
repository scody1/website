'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { Product, HomepageSection } from '@/lib/types';
import { Star, Heart, Eye, ShoppingBag, Check } from 'lucide-react';

interface ProductSectionsProps {
  activeCategoryFilter: string;
}

export default function ProductSections({ activeCategoryFilter }: ProductSectionsProps) {
  const { state, addToCart, setSelectedProductForQuickView, showToast } = useStore();
  const [activeTab, setActiveTab] = useState<HomepageSection>('ALL');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [addedAnimationId, setAddedAnimationId] = useState<string | null>(null);

  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (wishlist.includes(productId)) {
      setWishlist((prev) => prev.filter((id) => id !== productId));
      showToast('Wishlist Updated', 'Item removed from your devotional wishlist.', 'info');
    } else {
      setWishlist((prev) => [...prev, productId]);
      showToast('Added to Wishlist ❤️', 'Item saved to your sacred wishlist.');
    }
  };

  const handleAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    setAddedAnimationId(product.id);
    setTimeout(() => setAddedAnimationId(null), 1200);
  };

  // Filter products by selected category and active section tab
  const filteredProducts = state.products.filter((p) => {
    // 1. Category filter
    if (activeCategoryFilter !== 'ALL' && p.category !== activeCategoryFilter) {
      return false;
    }
    // 2. Section Tab filter
    if (activeTab === 'ALL') return true;
    return p.section === activeTab;
  });

  const sectionTabs: { key: HomepageSection; label: string }[] = [
    { key: 'ALL', label: 'All Essentials' },
    { key: 'ZODIAC', label: 'Shop By Zodiac' },
    { key: 'SHANKH', label: 'Divine Shankh' },
    { key: 'DEEPAM', label: 'Mangalavar Deepam' },
    { key: 'MURTI', label: 'Murti Sangrah' },
    { key: 'URLI', label: 'Brass Urlis' },
    { key: 'EXPLORE', label: 'Explore Collections' }
  ];

  return (
    <section id="catalog-sections" className="max-w-7xl mx-auto px-3 sm:px-6 mt-14 sm:mt-20">

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-saffron-600 block">
            Sacred Catalog
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-maroon-700 mt-1">
            Handcrafted Devotional Collections
          </h2>
          <div className="w-16 h-0.5 bg-gradient-to-r from-maroon-700 to-gold-500 mt-2" />
        </div>

        {/* Count pill */}
        <div className="text-xs font-semibold text-espresso-muted">
          Showing <span className="text-maroon-700 font-bold">{filteredProducts.length}</span> authentic items
        </div>
      </div>

      {/* Collection Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 no-scrollbar">
        {sectionTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-sm ${isActive
                ? 'bg-maroon-700 text-parchment-100 shadow-md ring-2 ring-gold-400'
                : 'bg-parchment-200 text-espresso hover:bg-gold-100 hover:text-maroon-700'
                }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-parchment-100 border border-gold-400/50 rounded-3xl p-12 text-center my-8">
          <p className="font-serif text-lg font-bold text-maroon-700">No sacred items match the selected filter.</p>
          <p className="text-xs text-espresso-muted mt-1">Try switching categories or view All Essentials.</p>
          <button
            onClick={() => setActiveTab('ALL')}
            className="mt-4 bg-maroon-700 text-parchment-100 px-5 py-2 rounded-xl text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6 mt-6">
          {filteredProducts.map((product) => {
            const isWishlisted = wishlist.includes(product.id);
            const hasDiscount = product.mrp > product.sellingPrice && product.mrp > 0;
            const discount = hasDiscount ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100) : 0;
            const isAdded = addedAnimationId === product.id;

            return (
              <div
                key={product.id}
                onClick={() => setSelectedProductForQuickView(product)}
                className="group bg-white rounded-2xl border border-gold-500/40 shadow-sm hover:shadow-luxury-hover transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
              >
                {/* Product Image Box */}
                <div className="relative aspect-square overflow-hidden bg-parchment-100">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Discount Badge */}
                  {hasDiscount && (
                    <div className="absolute top-2.5 left-2.5 bg-saffron-500 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-md">
                      {discount}% OFF
                    </div>
                  )}

                  {/* Stock Status Badge */}
                  {product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute bottom-2.5 left-2.5 bg-amber-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">
                      Only {product.stock} Left!
                    </div>
                  )}
                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center">
                      <span className="bg-red-700 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Out of Stock
                      </span>
                    </div>
                  )}

                  {/* Action Icons: Wishlist & Quick View */}
                  <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-colors shadow-md ${isWishlisted
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-white/90 hover:bg-rose-50 text-stone-600 hover:text-rose-600'
                        }`}
                      title="Add to Wishlist"
                    >
                      <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600' : ''}`} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProductForQuickView(product);
                      }}
                      className="w-8 h-8 rounded-full bg-white/90 hover:bg-parchment-200 text-maroon-700 flex items-center justify-center backdrop-blur-md transition-colors shadow-md"
                      title="Quick View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details Box */}
                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    {/* Category & Rating */}
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-semibold text-stone-500 uppercase tracking-wider text-[10px]">
                        {product.category}
                      </span>
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{product.rating}</span>
                        <span className="text-stone-400">({product.reviewCount})</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-sm font-bold text-espresso line-clamp-2 leading-snug group-hover:text-maroon-700 transition-colors">
                      {product.name}
                    </h3>
                  </div>

                  {/* Pricing & Full-Width Add To Cart Button */}
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-lg font-extrabold text-maroon-700 font-serif">
                        ₹{product.sellingPrice}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-stone-400 line-through">
                          ₹{product.mrp}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleAdd(product, e)}
                      disabled={product.stock <= 0}
                      className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md ${isAdded
                        ? 'bg-emerald-600 text-white'
                        : product.stock <= 0
                          ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                          : 'bg-saffron-500 hover:bg-saffron-600 text-white active:scale-98'
                        }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Added!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4" />
                          <span>Add to Sacred Cart</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </section>
  );
}
