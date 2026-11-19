'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/storeContext';
import { Order, OrderStatus } from '@/lib/types';
import { Search, CheckCircle2, Clock, Truck, Package, Home, ExternalLink, X } from 'lucide-react';

export default function TrackingModal() {
  const { isTrackingModalOpen, setIsTrackingModalOpen, findOrderOrShipment, trackingQuery, setTrackingQuery } = useStore();
  const [query, setQuery] = useState(trackingQuery || '');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (trackingQuery) {
      setQuery(trackingQuery);
      const found = findOrderOrShipment(trackingQuery);
      setSearchedOrder(found || null);
      setHasSearched(true);
    }
  }, [trackingQuery, findOrderOrShipment]);

  if (!isTrackingModalOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const found = findOrderOrShipment(query);
    setSearchedOrder(found || null);
    setHasSearched(true);
    setTrackingQuery(query);
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-900 border-2 border-gold-500/60 rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-parchment-100 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => setIsTrackingModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full bg-stone-800/80 border border-stone-700 hover:border-gold-500 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-md mx-auto mb-6">
          <div className="inline-flex items-center gap-1.5 bg-gold-500/20 text-gold-300 border border-gold-400/40 px-3 py-1 rounded-full text-xs font-bold mb-2">
            <Truck className="w-3.5 h-3.5 text-saffron-400" />
            <span>Pan-India Live Dispatch Tracking</span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-parchment-100">
            Track Sacred Pooja Order
          </h2>
          <p className="text-xs text-stone-300 mt-1">
            Enter your Order ID (e.g. RPS-123456), Courier AWB, or 10-digit mobile number.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order ID / AWB / Mobile..."
            className="flex-1 bg-stone-800 border border-gold-500/50 focus:border-gold-400 rounded-xl px-4 py-3 text-xs sm:text-sm text-parchment-100 placeholder:text-stone-500 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-5 py-3 rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>Track</span>
          </button>
        </form>

        {/* Results */}
        {hasSearched && (
          <div>
            {searchedOrder ? (
              <div className="space-y-5 animate-fadeIn">
                <div className="bg-stone-800/90 border border-gold-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Order Reference</span>
                    <h3 className="font-serif text-lg font-bold text-gold-300">
                      Order #{searchedOrder.id}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Current Status</span>
                    <div className="text-sm font-bold text-saffron-400">
                      {searchedOrder.orderStatus}
                    </div>
                  </div>
                </div>

                {/* 5-Step Visual Timeline */}
                <div className="py-2">
                  <div className="grid grid-cols-5 gap-1 relative">
                    {steps.map((st, idx) => {
                      const isComplete = idx <= getStepStatusIndex(searchedOrder.orderStatus);
                      const isCurrent = idx === getStepStatusIndex(searchedOrder.orderStatus);
                      const IconComponent = st.icon;

                      return (
                        <div key={st.label} className="flex flex-col items-center text-center">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                              isComplete
                                ? 'bg-gold-500 border-gold-300 text-stone-950 font-bold shadow-md'
                                : 'bg-stone-800 border-stone-700 text-stone-500'
                            } ${isCurrent ? 'ring-4 ring-gold-400/30 scale-105' : ''}`}
                          >
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <span
                            className={`text-[10px] sm:text-xs mt-2 font-medium leading-tight ${
                              isComplete ? 'text-gold-200 font-bold' : 'text-stone-500'
                            }`}
                          >
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Courier & AWB Details */}
                {searchedOrder.courierBooking ? (
                  <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-4 text-xs space-y-2 text-emerald-200">
                    <div className="flex justify-between">
                      <span className="text-emerald-400 font-semibold">Assigned Courier:</span>
                      <span className="font-semibold text-white">{searchedOrder.courierBooking.courierPartner}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-300 font-semibold">AWB Tracking Number:</span>
                      <span className="font-mono font-bold text-gold-300">{searchedOrder.courierBooking.awbCode}</span>
                    </div>
                    {searchedOrder.courierBooking.trackingUrl && (
                      <div className="pt-2">
                        <a
                          href={searchedOrder.courierBooking.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-saffron-400 hover:text-saffron-300 font-bold underline"
                        >
                          <span>Open Live Courier Tracking Page</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-stone-800/80 border border-gold-500/30 rounded-xl p-4 text-xs text-stone-300">
                    <p className="font-semibold text-gold-300">Packaging In Progress</p>
                    <p className="text-stone-400 mt-0.5">
                      Your devotional parcel is being packed securely with multi-layer bubble wrap. AWB and courier tracking will update once pickup is dispatched.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-stone-400 text-sm">
                No orders found matching &ldquo;{query}&rdquo;. Please verify your Order ID or phone number.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
