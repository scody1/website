'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/storeContext';
import { useToast } from '@/lib/toast';
import { shareProduct } from '@/lib/share';
import { Product, HomepageSection } from '@/lib/shared/types';
import { Star, Heart, Eye, ShoppingBag, Check, Share2, X } from 'lucide-react';

interface ProductSectionsProps {
  activeCategoryFilter: string;
  onResetCategory?: () => void;
}

export default function ProductSections({ activeCategoryFilter, onResetCategory }: ProductSectionsProps) {
  const { state, addToCart, setSelectedProductForQuickView, isWishlisted, toggleWishlist } = useStore();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<HomepageSection>('ALL');
  const [addedAnimationId, setAddedAnimationId] = useState<string | null>(null);

  // When a category filter is selected from the circular carousel, reset the section tab to 'ALL'
  useEffect(() => {
    if (activeCategoryFilter !== 'ALL') {
      setActiveTab('ALL');
    }
  }, [activeCategoryFilter]);

  const handleAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    setAddedAnimationId(product.id);
    setTimeout(() => setAddedAnimationId(null), 1200);
  };

  const handleShare = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    shareProduct(product, showToast);
  };

  // Filter products by selected category and active section tab
  const filteredProducts = state.products.filter((p) => {
    // 1. Category filter (case-insensitive & robust matching)
    if (activeCategoryFilter !== 'ALL') {
      const filterLower = activeCategoryFilter.trim().toLowerCase();
      const productCatLower = (p.category || '').trim().toLowerCase();
      const matchesCategory =
        productCatLower === filterLower ||
        p.categoryId === activeCategoryFilter ||
        (productCatLower.length > 0 && filterLower.includes(productCatLower)) ||
        (filterLower.length > 0 && productCatLower.includes(filterLower));
      if (!matchesCategory) return false;
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

          {/* Active Category Filter Indicator */}
          {activeCategoryFilter !== 'ALL' && (
            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-2 bg-saffron-50 text-maroon-800 border border-gold-400 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                <span>Category: <strong>{activeCategoryFilter}</strong></span>
                {onResetCategory && (
                  <button
                    onClick={onResetCategory}
                    className="p-0.5 rounded-full hover:bg-gold-200 text-maroon-700 transition-colors"
                    title="Clear filter"
                    aria-label="Clear filter"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            </div>
          )}
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
        <div className="bg-parchment-100 border border-gold-400/50 rounded-3xl p-10 sm:p-14 text-center my-8">
          <p className="font-serif text-xl font-bold text-maroon-700">
            {activeCategoryFilter !== 'ALL'
              ? `No products listed in "${activeCategoryFilter}" yet.`
              : 'No sacred items match the selected filter.'}
          </p>
          <p className="text-xs text-espresso-muted mt-2 max-w-md mx-auto">
            {activeCategoryFilter !== 'ALL'
              ? 'New items for this collection are being consecrated and added to the store. You can add products to this category in Admin → Products & Stock, or explore all items below.'
              : 'Try selecting another collection or view all sacred essentials.'}
          </p>
          <button
            onClick={() => {
              setActiveTab('ALL');
              if (onResetCategory) onResetCategory();
            }}
            className="mt-5 bg-maroon-700 hover:bg-maroon-800 text-parchment-100 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
          >
            View All Essentials
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6 mt-6">
          {filteredProducts.map((product) => {
            const wishlisted = isWishlisted(product.id);
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

                  {/* Action Icons: Wishlist, Quick View, Share */}
                  <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-colors shadow-md ${wishlisted
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-white/90 hover:bg-rose-50 text-stone-600 hover:text-rose-600'
                        }`}
                      title="Add to Wishlist"
                    >
                      <Heart className={`w-4 h-4 ${wishlisted ? 'fill-rose-600' : ''}`} />
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

                    <button
                      onClick={(e) => handleShare(product, e)}
                      className="w-8 h-8 rounded-full bg-white/90 hover:bg-gold-100 text-stone-600 hover:text-maroon-700 flex items-center justify-center backdrop-blur-md transition-colors shadow-md"
                      title="Share Product"
                      aria-label="Share Product"
                    >
                      <Share2 className="w-4 h-4" />
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
                      {product.reviewCount > 0 && (
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{product.rating}</span>
                          <span className="text-stone-400">({product.reviewCount})</span>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-serif text-sm font-bold text-espresso line-clamp-2 leading-snug group-hover:text-maroon-700 transition-colors">
                      <a href={`/product/${product.slug}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                        {product.name}
                      </a>
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
