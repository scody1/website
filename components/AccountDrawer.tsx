'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { formatINR, formatDateTime, formatWhatsAppUrl } from '@/lib/shared/format';
import { ORDER_STATUS_LABEL } from '@/lib/shared/orderStatus';
import {
  ExternalLink,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
  X
} from 'lucide-react';

export default function AccountDrawer() {
  const {
    customer,
    isAccountDrawerOpen,
    setIsAccountDrawerOpen,
    customerOrders,
    isLoadingCustomerOrders,
    logoutCustomer,
    updateProfile,
    loadCustomerOrders,
    state,
    setIsTrackingModalOpen,
    setTrackingQuery
  } = useStore();

  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');

  // Profile form state
  const [name, setName] = useState(customer?.name || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [addressLine1, setAddressLine1] = useState(customer?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(customer?.addressLine2 || '');
  const [city, setCity] = useState(customer?.city || '');
  const [stateName, setStateName] = useState(customer?.state || '');
  const [pincode, setPincode] = useState(customer?.pincode || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Sync state if customer changes
  React.useEffect(() => {
    if (customer) {
      setName(customer.name);
      setEmail(customer.email || '');
      setAddressLine1(customer.addressLine1 || '');
      setAddressLine2(customer.addressLine2 || '');
      setCity(customer.city || '');
      setStateName(customer.state || '');
      setPincode(customer.pincode || '');
    }
  }, [customer]);

  if (!isAccountDrawerOpen || !customer) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim()
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const label = ORDER_STATUS_LABEL[status as keyof typeof ORDER_STATUS_LABEL] || status;
    let color = 'bg-stone-100 text-stone-700 border-stone-200';
    if (['DELIVERED'].includes(status)) {
      color = 'bg-emerald-50 text-emerald-700 border-emerald-300';
    } else if (['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(status)) {
      color = 'bg-blue-50 text-blue-700 border-blue-300';
    } else if (['NEW', 'PROCESSING', 'PACKED', 'READY_TO_SHIP'].includes(status)) {
      color = 'bg-amber-50 text-amber-700 border-amber-300';
    } else if (['CANCELLED', 'RTO'].includes(status)) {
      color = 'bg-rose-50 text-rose-700 border-rose-300';
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${color}`}>
        {label}
      </span>
    );
  };

  const handleTrackOrder = (orderNumber: string) => {
    setTrackingQuery(orderNumber);
    setIsAccountDrawerOpen(false);
    setIsTrackingModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        onClick={() => setIsAccountDrawerOpen(false)}
        className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-parchment-50 shadow-2xl flex flex-col border-l border-gold-500/40">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-maroon-700 to-maroon-800 p-5 text-parchment-100 flex items-center justify-between border-b border-gold-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold-400/20 border border-gold-400/50 flex items-center justify-center font-serif text-lg font-bold text-gold-300 shadow-inner">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-white flex items-center gap-1.5">
                  <span>Namaste, {customer.name}</span>
                </h3>
                <p className="text-[11px] text-parchment-200">+91 {customer.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={logoutCustomer}
                className="text-parchment-200 hover:text-white hover:bg-maroon-900/50 p-2 rounded-xl transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsAccountDrawerOpen(false)}
                className="text-parchment-200 hover:text-white hover:bg-maroon-900/50 p-2 rounded-xl transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-2 bg-parchment-100 border-b border-gold-300/40 text-xs sm:text-sm font-bold">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-3 flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'orders'
                  ? 'bg-white text-maroon-700 border-b-2 border-maroon-700 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>My Orders ({customerOrders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-3 flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'profile'
                  ? 'bg-white text-maroon-700 border-b-2 border-maroon-700 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile & Address</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {activeTab === 'orders' ? (
              /* MY ORDERS TAB */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">Order History</span>
                  <button
                    onClick={() => loadCustomerOrders()}
                    disabled={isLoadingCustomerOrders}
                    className="text-xs font-semibold text-maroon-700 hover:underline"
                  >
                    {isLoadingCustomerOrders ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                {isLoadingCustomerOrders && customerOrders.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-stone-400">
                    <Loader2 className="w-6 h-6 animate-spin text-maroon-700 mb-2" />
                    <p className="text-xs">Loading your orders...</p>
                  </div>
                ) : customerOrders.length === 0 ? (
                  <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gold-300/60 p-6">
                    <ShoppingBag className="w-10 h-10 text-gold-500/60 mx-auto mb-2" />
                    <h4 className="font-serif font-bold text-espresso text-sm">No Orders Yet</h4>
                    <p className="text-xs text-stone-500 mt-1">
                      Your past and current spiritual purchases will appear here.
                    </p>
                    <button
                      onClick={() => setIsAccountDrawerOpen(false)}
                      className="mt-4 inline-flex items-center gap-1.5 bg-maroon-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-maroon-800 transition"
                    >
                      Explore Sacred Catalogue
                    </button>
                  </div>
                ) : (
                  customerOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-gold-300/50 p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Order top bar */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-stone-100">
                        <div>
                          <div className="font-mono text-xs font-bold text-maroon-700">
                            #{order.orderNumber}
                          </div>
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            {formatDateTime(order.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(order.status)}
                          <div className="text-[10px] text-stone-500 font-medium mt-1">
                            {order.paymentMethod} • {order.paymentStatus}
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="py-3 space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-11 h-11 object-cover rounded-lg border border-gold-200"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-lg bg-parchment-100 border border-gold-200 flex items-center justify-center text-gold-600 font-serif font-bold text-xs">
                                RPS
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-espresso truncate">{item.name}</p>
                              <p className="text-[11px] text-stone-400">Qty: {item.quantity} × {formatINR(item.unitPrice)}</p>
                            </div>
                            <div className="text-xs font-bold text-espresso">
                              {formatINR(item.lineTotal)}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Total & Actions */}
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-stone-400 uppercase font-bold">Total Paid</span>
                          <p className="text-sm font-bold text-maroon-700">{formatINR(order.total)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {order.trackingUrl ? (
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Live Track</span>
                            </a>
                          ) : (
                            <button
                              onClick={() => handleTrackOrder(order.orderNumber)}
                              className="text-xs font-bold text-maroon-700 hover:bg-parchment-100 border border-gold-400/40 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                            >
                              <Truck className="w-3.5 h-3.5 text-saffron-600" />
                              <span>Track</span>
                            </button>
                          )}

                          <a
                            href={formatWhatsAppUrl(
                              state.storeConfig.whatsapp || state.storeConfig.supportPhone,
                              `🙏 Namaste! I need help with my Order #${order.orderNumber}.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1.5 rounded-lg flex items-center gap-1 transition"
                            title="Help on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* PROFILE & ADDRESS TAB */
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="bg-white rounded-2xl border border-gold-300/50 p-4 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-maroon-700 uppercase tracking-wider pb-1 border-b border-stone-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Personal Info</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 px-3 text-xs sm:text-sm text-espresso focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">Verified Mobile</label>
                    <input
                      type="text"
                      value={`+91 ${customer.phone}`}
                      disabled
                      className="w-full bg-stone-100 border border-stone-200 rounded-xl py-2 px-3 text-xs sm:text-sm text-stone-500 cursor-not-allowed font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. you@example.com"
                      className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 px-3 text-xs sm:text-sm text-espresso focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gold-300/50 p-4 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-maroon-700 uppercase tracking-wider pb-1 border-b border-stone-100">
                    <MapPin className="w-4 h-4 text-maroon-700" />
                    <span>Saved Delivery Address</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="House / Flat No., Street, Colony"
                      className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 px-3 text-xs sm:text-sm text-espresso focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">Landmark (Optional)</label>
                    <input
                      type="text"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="Near Temple, Market, etc."
                      className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 px-3 text-xs sm:text-sm text-espresso focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-1">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 px-2 text-xs text-espresso focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-1">State</label>
                      <input
                        type="text"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="State"
                        className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 px-2 text-xs text-espresso focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-1">Pincode</label>
                      <input
                        type="text"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="6 digits"
                        maxLength={6}
                        className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 px-2 text-xs text-espresso focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full bg-maroon-700 hover:bg-maroon-800 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{savingProfile ? 'Saving Changes...' : 'Save Profile & Address'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
