'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { Order, OrderStatus } from '@/lib/types';
import { Search, CheckCircle2, Clock, Truck, Package, Home, ExternalLink } from 'lucide-react';

export default function OrderTrackerSection() {
  const { findOrderOrShipment, trackingQuery, setTrackingQuery } = useStore();
  const [query, setQuery] = useState(trackingQuery || '');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const found = findOrderOrShipment(query);
    setSearchedOrder(found || null);
    setHasSearched(true);
    setTrackingQuery(query);
  };

  // 5-step progression mapping
  const steps: { label: string; status: OrderStatus; icon: React.ElementType }[] = [
    { label: 'Order Confirmed', status: 'New Order', icon: CheckCircle2 },
    { label: 'Packed', status: 'Packed', icon: Package },
    { label: 'Pickup Scheduled', status: 'Pickup Scheduled', icon: Clock },
    { label: 'In Transit', status: 'In Transit', icon: Truck },
    { label: 'Delivered', status: 'Delivered', icon: Home }
  ];

  const getStepStatusIndex = (currentStatus: OrderStatus) => {
    switch (currentStatus) {
      case 'New Order':
      case 'Processing':
        return 0;
      case 'Packed':
        return 1;
      case 'Pickup Scheduled':
      case 'Shipped':
        return 2;
      case 'In Transit':
        return 3;
      case 'Delivered':
        return 4;
      default:
        return 0;
    }
  };

  return (
    <section id="order-tracking-section" className="max-w-7xl mx-auto px-3 sm:px-6 mt-14 sm:mt-20">
      <div className="bg-gradient-to-br from-stone-900 via-maroon-950 to-stone-900 border-2 border-gold-500/50 rounded-3xl p-6 sm:p-10 shadow-2xl text-parchment-100">
        
        {/* Title */}
        <div className="text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-gold-500/20 text-gold-300 border border-gold-400/40 px-3 py-1 rounded-full text-xs font-bold mb-3">
            <Truck className="w-3.5 h-3.5 text-saffron-400" />
            <span>Pan-India Live Dispatch Tracking</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-parchment-100">
            Track Your Sacred Pooja Parcel
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1">
            Enter your Order ID (e.g. RPS-123456), Courier AWB Number, or registered 10-digit mobile number.
          </p>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="max-w-md mx-auto mt-6 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Order ID / AWB / Phone Number..."
              className="w-full bg-stone-800/90 border border-gold-500/50 focus:border-gold-400 rounded-xl px-4 py-3 text-xs sm:text-sm text-parchment-100 placeholder:text-stone-400 focus:outline-none shadow-inner"
            />
          </div>
          <button
            type="submit"
            className="bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-5 py-3 rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap active:scale-95"
          >
            <Search className="w-4 h-4" />
            <span>Track Order</span>
          </button>
        </form>

        {/* Tracking Details View */}
        {hasSearched && (
          <div className="mt-8 pt-8 border-t border-gold-500/30 max-w-3xl mx-auto">
            {searchedOrder ? (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Header Summary Card */}
                <div className="bg-stone-800/90 border border-gold-500/40 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Order Reference</span>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-gold-300">
                      Order #{searchedOrder.id}
                    </h3>
                    <p className="text-xs text-stone-300 mt-0.5">
                      Customer: <strong>{searchedOrder.customer.name}</strong> • Destination: {searchedOrder.customer.city}, {searchedOrder.customer.state} ({searchedOrder.customer.pincode})
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="inline-block bg-saffron-500/20 border border-saffron-400 text-saffron-300 px-3 py-1 rounded-full text-xs font-bold">
                      {searchedOrder.orderStatus}
                    </span>
                    <p className="text-[11px] text-stone-400 mt-1">
                      Payment: {searchedOrder.paymentMethod} (₹{searchedOrder.totalAmount})
                    </p>
                  </div>
                </div>

                {/* 5-Step Visual Progress Bar */}
                <div className="bg-stone-800/70 border border-gold-500/30 rounded-2xl p-6 sm:p-8">
                  <div className="relative">
                    {/* Connecting line */}
                    <div className="hidden sm:block absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-stone-700 z-0">
                      <div
                        className="h-full bg-gradient-to-r from-gold-500 to-saffron-500 transition-all duration-700"
                        style={{
                          width: `${(getStepStatusIndex(searchedOrder.orderStatus) / (steps.length - 1)) * 100}%`
                        }}
                      />
                    </div>

                    {/* Step nodes */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                      {steps.map((st, idx) => {
                        const currentIndex = getStepStatusIndex(searchedOrder.orderStatus);
                        const isCompleted = idx <= currentIndex;
                        const isCurrent = idx === currentIndex;
                        const Icon = st.icon;

                        return (
                          <div key={idx} className="flex sm:flex-col items-center gap-3 sm:gap-2 text-center">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-md ${
                                isCompleted
                                  ? 'bg-saffron-500 text-white ring-4 ring-gold-500/30'
                                  : 'bg-stone-700 text-stone-400 border border-stone-600'
                              } ${isCurrent ? 'animate-pulse' : ''}`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="text-left sm:text-center">
                              <p
                                className={`text-xs font-bold leading-tight ${
                                  isCompleted ? 'text-gold-200' : 'text-stone-400'
                                }`}
                              >
                                {st.label}
                              </p>
                              {isCurrent && (
                                <span className="inline-block text-[10px] text-emerald-400 font-semibold">
                                  Current Status
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Courier / Live Tracking Link */}
                {searchedOrder.courierBooking ? (
                  <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-200">
                    <div>
                      <p className="text-xs font-bold text-emerald-400">
                        Assigned Courier: {searchedOrder.courierBooking.courierPartner}
                      </p>
                      <p className="text-xs text-stone-300">
                        AWB Tracking Number: <strong className="text-gold-300">{searchedOrder.courierBooking.awbCode}</strong>
                      </p>
                    </div>

                    <a
                      href={searchedOrder.courierBooking.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow"
                    >
                      <span>Open Live Courier Tracking</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="bg-stone-800/80 border border-gold-500/30 rounded-2xl p-4 text-xs text-stone-300">
                    <p className="font-semibold text-gold-300">Packaging In Progress</p>
                    <p className="text-stone-400 mt-0.5">
                      Your devotional parcel is being packed securely with multi-layer bubble wrap. AWB and courier tracking will update once pickup is dispatched.
                    </p>
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-6 bg-stone-800/60 rounded-2xl border border-stone-700">
                <p className="text-sm font-bold text-gold-300">No matching order found for "{query}".</p>
                <p className="text-xs text-stone-400 mt-1">
                  Please verify the Order ID or enter the 10-digit mobile number used during checkout.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
