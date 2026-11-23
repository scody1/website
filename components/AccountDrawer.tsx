'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { formatINR, formatDateTime, formatWhatsAppUrl } from '@/lib/shared/format';
import { ORDER_STATUS_LABEL } from '@/lib/shared/orderStatus';
import type { CustomerOrderSummary } from '@/lib/shared/types';
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
  X,
  XCircle,
  Heart
} from 'lucide-react';

const CANCEL_REASONS = [
  'Ordered by mistake',
  'Found a better price or alternative',
  'Delivery time is too long',
  'Want to change items or address',
  'Other reason'
];

const REFUND_REASONS = [
  'Item arrived damaged or broken',
  'Substandard quality or defective',
  'Incorrect or missing items in parcel',
  'Package not received',
  'Other issue'
];

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
    cancelOrRefundOrder,
    state,
    setIsTrackingModalOpen,
    setTrackingQuery,
    claimOrder,
    wishlist,
    toggleWishlist,
    addToCart
  } = useStore();

  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'profile'>('orders');
  const [claimNumber, setClaimNumber] = useState('');
  const [claimPin, setClaimPin] = useState('');
  const [claiming, setClaiming] = useState(false);

  // Cancel & Refund Dialog state
  const [actionOrder, setActionOrder] = useState<CustomerOrderSummary | null>(null);
  const [actionType, setActionType] = useState<'cancel' | 'refund'>('cancel');
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [customNote, setCustomNote] = useState('');
  const [refundUpiId, setRefundUpiId] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

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

  const handleOpenAction = (order: CustomerOrderSummary, type: 'cancel' | 'refund') => {
    setActionOrder(order);
    setActionType(type);
    setSelectedReason(type === 'cancel' ? CANCEL_REASONS[0] : REFUND_REASONS[0]);
    setCustomNote('');
    setRefundUpiId('');
  };

  const handleCloseAction = () => {
    if (submittingAction) return;
    setActionOrder(null);
  };

  const handleSubmitAction = async () => {
    if (!actionOrder || !selectedReason) return;
    setSubmittingAction(true);
    try {
      const fullReason = customNote.trim() ? `${selectedReason} — ${customNote.trim()}` : selectedReason;
      await cancelOrRefundOrder(actionOrder.id, fullReason, refundUpiId.trim() || undefined);
      setActionOrder(null);
    } finally {
      setSubmittingAction(false);
    }
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
          <div className="grid grid-cols-3 bg-parchment-100 border-b border-gold-300/40 text-xs sm:text-sm font-bold">
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
              onClick={() => setActiveTab('wishlist')}
              className={`py-3 flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'wishlist'
                  ? 'bg-white text-maroon-700 border-b-2 border-maroon-700 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Wishlist ({wishlist.length})</span>
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
              <span>Profile</span>
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

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!claimNumber.trim() || claimPin.length !== 6) return;
                    setClaiming(true);
                    const ok = await claimOrder(claimNumber.trim(), claimPin);
                    setClaiming(false);
                    if (ok) { setClaimNumber(''); setClaimPin(''); }
                  }}
                  className="bg-white rounded-2xl border border-gold-300/50 p-3 text-xs space-y-1.5"
                >
                  <p className="font-bold text-stone-700">Ordered before creating your account?</p>
                  <div className="flex gap-2">
                    <input
                      value={claimNumber}
                      onChange={(e) => setClaimNumber(e.target.value.toUpperCase())}
                      placeholder="Order number, e.g. RPS-100001"
                      className="flex-1 border border-stone-300 rounded-lg px-2.5 py-1.5 focus:border-maroon-700 focus:outline-none"
                      aria-label="Order number to add"
                    />
                    <input
                      value={claimPin}
                      onChange={(e) => setClaimPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      placeholder="Pincode"
                      className="w-20 border border-stone-300 rounded-lg px-2.5 py-1.5 focus:border-maroon-700 focus:outline-none"
                      aria-label="Delivery pincode of that order"
                    />
                    <button type="submit" disabled={claiming} className="bg-maroon-700 text-white font-bold px-3 py-1.5 rounded-lg disabled:opacity-60">
                      {claiming ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-500">Enter the order number and its delivery pincode. It must have been placed with your mobile number +91 {customer.phone}.</p>
                </form>

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
                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-[10px] text-stone-400 uppercase font-bold">Total Paid</span>
                          <p className="text-sm font-bold text-maroon-700">{formatINR(order.total)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Cancel or Refund Button */}
                          {order.canCancel ? (
                            <button
                              onClick={() => handleOpenAction(order, 'cancel')}
                              className="text-xs font-bold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shadow-xs"
                              title="Cancel this order"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          ) : order.canRequestReturn ? (
                            <button
                              onClick={() => handleOpenAction(order, 'refund')}
                              className="text-xs font-bold text-amber-800 hover:text-amber-900 hover:bg-amber-50 border border-amber-400/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition shadow-xs"
                              title="Request Return & Refund"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Return / Refund</span>
                            </button>
                          ) : null}

                          {order.trackingUrl ? (
                            <a
                              href={order.trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Track</span>
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

                      {/* Status / Cancellation / Refund Banners */}
                      {order.status === 'CANCELLED' ? (
                        <div className="mt-2.5 bg-rose-50 border border-rose-200/80 rounded-xl p-2.5 text-xs text-rose-800">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Order Cancelled</span>
                            </span>
                            {order.paymentStatus === 'REFUNDED' ? (
                              <span className="text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded text-[10px]">Refunded {formatINR(order.refundAmount || order.total)}</span>
                            ) : order.refundDue ? (
                              <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[10px]">Refund in progress</span>
                            ) : null}
                          </div>
                          {order.cancelReason && <p className="text-[11px] text-rose-700 mt-1">{order.cancelReason}</p>}
                          {order.refundDue && (
                            <p className="text-[10px] text-stone-600 mt-0.5">The store will send your refund of {formatINR(order.total - (order.refundAmount || 0))} shortly. Contact us on WhatsApp if you have questions.</p>
                          )}
                        </div>
                      ) : order.status === 'REFUNDED' ? (
                        <div className="mt-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl p-2.5 text-xs text-emerald-800">
                          <span className="font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Refund Completed</span>
                          </span>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Amount: {formatINR(order.refundAmount || order.total)}
                          </p>
                        </div>
                      ) : order.returnRequest ? (
                        <div className={`mt-2.5 rounded-xl p-2.5 text-xs border ${order.returnRequest.status === 'REJECTED' ? 'bg-stone-50 border-stone-300 text-stone-700' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
                          <div className="flex items-center gap-1.5 font-bold">
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                            <span>
                              {order.returnRequest.status === 'OPEN' ? 'Return request submitted — under review'
                                : order.returnRequest.status === 'APPROVED' ? 'Return approved'
                                : order.returnRequest.status === 'REJECTED' ? 'Return request declined'
                                : 'Return completed'}
                            </span>
                          </div>
                          {order.returnRequest.adminNote && <p className="text-[11px] mt-0.5">{order.returnRequest.adminNote}</p>}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === 'wishlist' ? (
              /* WISHLIST TAB */
              <div className="space-y-3">
                {wishlist.length === 0 ? (
                  <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gold-300/60 p-6">
                    <Heart className="w-10 h-10 text-rose-300 mx-auto mb-2" />
                    <p className="text-xs text-stone-500">Tap the heart on any product to save it here.</p>
                  </div>
                ) : (
                  wishlist.map((pid) => {
                    const p = state.products.find((x) => x.id === pid);
                    if (!p) return null;
                    return (
                      <div key={pid} className="bg-white rounded-2xl border border-gold-300/50 p-3 flex items-center gap-3">
                        {p.images[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt="" className="w-14 h-14 rounded-xl object-cover border border-gold-200" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-parchment-100" />
                        )}
                        <div className="flex-1 min-w-0">
                          <a href={`/product/${p.slug}`} className="text-xs font-bold text-espresso hover:underline line-clamp-2">{p.name}</a>
                          <p className="text-xs font-bold text-maroon-700 mt-0.5">{formatINR(p.sellingPrice)}</p>
                          <p className={`text-[10px] ${p.stock > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{p.stock > 0 ? 'In stock' : 'Out of stock'}</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <button disabled={p.stock <= 0} onClick={() => addToCart(p, 1)} className="text-[11px] font-bold bg-saffron-500 disabled:bg-stone-300 text-white px-2.5 py-1 rounded-lg">Add to cart</button>
                          <button onClick={() => toggleWishlist(p)} className="text-[11px] font-bold text-rose-700 hover:underline">Remove</button>
                        </div>
                      </div>
                    );
                  })
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

      {/* Cancel & Refund Modal Dialog */}
      {actionOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-gold-500/60 shadow-2xl overflow-hidden text-espresso">
            <div className="bg-gradient-to-r from-maroon-700 to-maroon-800 p-4 text-parchment-100 flex items-center justify-between">
              <h4 className="font-serif font-bold text-sm flex items-center gap-1.5">
                {actionType === 'cancel' ? (
                  <>
                    <XCircle className="w-4 h-4 text-rose-300" />
                    <span>Cancel Order #{actionOrder.orderNumber}</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 text-gold-300" />
                    <span>Request Return & Refund</span>
                  </>
                )}
              </h4>
              <button
                onClick={handleCloseAction}
                disabled={submittingAction}
                className="text-parchment-200 hover:text-white p-1 rounded-lg transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
              <div className="bg-parchment-100 rounded-xl p-3 border border-gold-300/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-500 uppercase font-bold">Total Paid</span>
                  <p className="text-sm font-bold text-maroon-700">{formatINR(actionOrder.total)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-500 uppercase font-bold">Payment</span>
                  <p className="text-xs font-semibold text-stone-700">{actionOrder.paymentMethod} • {actionOrder.paymentStatus}</p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1.5">
                  {actionType === 'cancel' ? 'Why do you want to cancel?' : 'Reason for Return & Refund'}
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {(actionType === 'cancel' ? CANCEL_REASONS : REFUND_REASONS).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedReason(r)}
                      className={`p-2 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                        selectedReason === r
                          ? 'border-maroon-700 bg-gold-50/80 font-bold text-maroon-800'
                          : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <span>{r}</span>
                      {selectedReason === r && <Check className="w-3.5 h-3.5 text-maroon-700" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Tell us any more details..."
                  rows={2}
                  className="w-full border border-stone-300 rounded-xl p-2.5 focus:border-maroon-700 focus:outline-none"
                />
              </div>

              {(actionOrder.paymentMethod === 'UPI' || actionOrder.paymentMethod === 'COD' || actionOrder.paymentStatus === 'PAID') && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Your UPI ID for Refund (Optional)
                  </label>
                  <input
                    type="text"
                    value={refundUpiId}
                    onChange={(e) => setRefundUpiId(e.target.value)}
                    placeholder="e.g. mobile@upi / yourname@okaxis"
                    className="w-full border border-stone-300 rounded-xl p-2.5 focus:border-maroon-700 focus:outline-none"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    For COD or UPI orders, refunds will be sent directly to this UPI ID.
                  </p>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={submittingAction || !selectedReason}
                  onClick={handleSubmitAction}
                  className="w-full bg-maroon-700 hover:bg-maroon-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {submittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {actionType === 'cancel' ? 'Confirm Cancellation' : 'Submit Return & Refund Request'}
                  </span>
                </button>

                <a
                  href={formatWhatsAppUrl(
                    state.storeConfig.whatsapp || state.storeConfig.supportPhone,
                    `🙏 Namaste! I need help with ${actionType === 'cancel' ? 'cancelling' : 'returning'} Order #${actionOrder.orderNumber}. Reason: ${selectedReason}.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-2 rounded-xl text-xs border border-emerald-300 transition text-center flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Help on WhatsApp</span>
                </a>

                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={handleCloseAction}
                  className="w-full py-1 text-stone-500 hover:text-stone-700 text-xs font-semibold"
                >
                  Never mind, keep order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
