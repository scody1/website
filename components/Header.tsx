'use client';

import React, { useState, useRef, useEffect } from 'react';
import Logo from './Logo';
import { useStore } from '@/lib/storeContext';
import { Product } from '@/lib/shared/types';
import { Search, ShoppingBag, Truck, MapPin, Instagram, X, User, UserCheck } from 'lucide-react';

export default function Header() {
  const {
    state,
    cart,
    setIsCartOpen,
    setIsTrackingModalOpen,
    setSelectedProductForQuickView,
    pincodeResult,
    customer,
    openAuthModal,
    setIsAccountDrawerOpen
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Total items in cart
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Live search suggestion filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = state.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
    ).slice(0, 5);

    setSuggestions(matches);
    setIsDropdownOpen(true);
  }, [searchQuery, state.products]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToPincode = () => {
    const el = document.getElementById('pincode-service-bar');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = el.querySelector('input');
      if (input) input.focus();
    } else {
      window.location.href = '/#pincode-service-bar';
    }
  };

  return (
    <>
      {/* 1. Top Deep Maroon Announcement Bar */}
      <div className="bg-maroon-700 text-parchment-100 text-[11px] sm:text-xs py-2 px-3 text-center font-medium tracking-wide border-b border-gold-500/30 flex items-center justify-center gap-2 relative z-50">
        <span className="animate-pulse text-gold-300">✦</span>
        <span>{state.storeConfig.announcement}</span>
        <span className="animate-pulse text-gold-300">✦</span>
      </div>

      {/* 2. Floating Glassmorphic Header */}
      <header className="sticky top-2 z-40 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto bg-parchment-100/90 backdrop-blur-md border border-gold-500/40 rounded-2xl shadow-luxury px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">

          {/* Left: Brand Logo & Title */}
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center focus:outline-none">
              <Logo size="md" />
            </a>
          </div>

          {/* Center: Live Search Bar with Instant Dropdown */}
          <div ref={searchRef} className="hidden md:flex flex-1 max-w-md mx-4 relative">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() && setIsDropdownOpen(true)}
                placeholder="Search Pooja Samagri, Brass Idols, Shankh, Dhoop..."
                className="w-full bg-parchment-200/90 border border-gold-500/50 focus:border-maroon-700 rounded-full py-2.5 pl-4 pr-10 text-xs sm:text-sm text-espresso focus:outline-none shadow-inner placeholder:text-stone-500 transition-colors"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-2.5 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <Search className="w-4 h-4 absolute right-3.5 top-2.5 text-maroon-700/70" />
              )}
            </div>

            {/* Instant Product Suggestions Dropdown */}
            {isDropdownOpen && suggestions.length > 0 && (
              <div className="absolute top-12 left-0 right-0 bg-white border border-gold-500/50 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-stone-100 animate-fadeIn">
                <div className="p-2 text-[10px] font-bold text-maroon-700 uppercase tracking-wider bg-parchment-50">
                  Instant Catalog Matches ({suggestions.length})
                </div>
                {suggestions.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      setSelectedProductForQuickView(prod);
                      setIsDropdownOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-parchment-50 cursor-pointer transition-colors"
                  >
                    <img
                      src={prod.images[0]}
                      alt={prod.name}
                      className="w-12 h-12 object-cover rounded-lg border border-gold-300/40"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-espresso truncate">
                        {prod.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-maroon-700">₹{prod.sellingPrice}</span>
                        <span className="text-[10px] text-stone-400 line-through">₹{prod.mrp}</span>
                        <span className="text-[10px] font-bold text-saffron-600 bg-saffron-50 px-1.5 rounded">
                          {Math.round(((prod.mrp - prod.sellingPrice) / prod.mrp) * 100)}% OFF
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Action Icons & Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Pincode Check Trigger */}
            <button
              onClick={scrollToPincode}
              className="hidden lg:inline-flex text-xs font-semibold text-espresso bg-parchment-200 hover:bg-gold-100 border border-gold-500/40 px-3 py-1.5 rounded-full items-center gap-1.5 transition shadow-sm"
              title="Check Delivery Availability"
            >
              <MapPin className="w-3.5 h-3.5 text-maroon-700" />
              <span>{pincodeResult ? `Pincode: ${pincodeResult.pincode}` : 'Check Pincode'}</span>
            </button>

            {/* Quick Order Track Button */}
            <button
              onClick={() => setIsTrackingModalOpen(true)}
              className="text-xs sm:text-sm font-semibold text-maroon-700 bg-parchment-200 hover:bg-gold-100 border border-gold-500/40 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition shadow-sm"
            >
              <Truck className="w-3.5 h-3.5 text-saffron-600" />
              <span className="hidden sm:inline">Track</span>
            </button>

            {/* Customer Account Button */}
            {customer ? (
              <button
                onClick={() => setIsAccountDrawerOpen(true)}
                className="text-xs sm:text-sm font-semibold text-maroon-700 bg-gold-100 hover:bg-gold-200 border border-gold-500/50 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition shadow-sm"
                title="My Account & Orders"
              >
                <UserCheck className="w-3.5 h-3.5 text-maroon-700" />
                <span className="hidden sm:inline font-medium max-w-[110px] truncate">{customer.name.split(' ')[0]}</span>
              </button>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="text-xs sm:text-sm font-semibold text-maroon-700 bg-parchment-200 hover:bg-gold-100 border border-gold-500/40 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition shadow-sm"
                title="Sign In / Register"
              >
                <User className="w-3.5 h-3.5 text-maroon-700" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Instagram Link (dynamically populated or fallback) */}
            {state.storeConfig.instagramUrl && (
              <a
                href={state.storeConfig.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-parchment-200 hover:bg-pink-100 text-pink-700 flex items-center justify-center border border-gold-500/30 transition shadow-sm"
                title="Follow us on Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}

            {/* Cart Drawer Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative w-10 h-10 rounded-full bg-maroon-700 text-white hover:bg-maroon-800 flex items-center justify-center shadow-md transition active:scale-95"
              title="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4 text-gold-200" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-saffron-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-scaleUp">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Row */}
        <div className="md:hidden max-w-7xl mx-auto mt-2 px-1">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Pooja items, Brass Idols, Shankh..."
              className="w-full bg-white/95 border border-gold-500/40 rounded-full py-2 pl-4 pr-9 text-xs text-espresso shadow-sm focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 absolute right-3.5 top-2.5 text-maroon-700" />
          </div>
        </div>
      </header>
    </>
  );
}
