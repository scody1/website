'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { X, Plus, Minus, Trash2, Tag, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateCartQty,
    activeCoupon,
    applyCoupon,
    removeCoupon,
    cartTotals,
    setIsCheckoutOpen
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [applying, setApplying] = useState(false);

  if (!isCartOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim() || applying) return;
    setApplying(true);
    const ok = await applyCoupon(couponInput.trim());
    setApplying(false);
    if (ok) setCouponInput('');
  };

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-gold-500/40">
          
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-maroon-700 to-maroon-800 text-parchment-100 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-gold-300" />
              <h2 className="font-serif text-lg font-bold">Your Sacred Cart</h2>
              <span className="text-xs bg-gold-500/20 text-gold-300 px-2 py-0.5 rounded-full font-bold">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="text-parchment-200 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Bar */}
          <div className="bg-parchment-100 border-b border-gold-400/30 p-3 text-xs">
            {cartTotals.qualifiesForFreeShipping ? (
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>You qualify for FREE Express Shipping! 🎉</span>
              </div>
            ) : (
              <div>
                <p className="text-espresso font-medium">
                  Add <strong className="text-maroon-700">₹{cartTotals.amountNeededForFreeShipping}</strong> more to unlock <strong>FREE Shipping</strong>!
                </p>
                <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="bg-gradient-to-r from-saffron-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (cartTotals.subtotal / (cartTotals.subtotal + cartTotals.amountNeededForFreeShipping)) * 100)}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-stone-100">
            {cart.length === 0 ? (
              <div className="py-16 text-center text-stone-500 space-y-3">
                <div className="w-16 h-16 rounded-full bg-parchment-200 border border-gold-400/50 flex items-center justify-center text-maroon-700 mx-auto">
                  <ShoppingBag className="w-8 h-8 opacity-60" />
                </div>
                <p className="font-serif text-base font-bold text-espresso">Your devotional cart is empty.</p>
                <p className="text-xs text-stone-400">Discover authentic brassware and pooja samagri.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.productId} className="pt-3 first:pt-0 flex gap-3 items-center">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-xl border border-gold-300/60 shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-espresso truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs font-bold text-maroon-700 mt-0.5">₹{item.price}</p>
                    
                    {/* Stepper */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50">
                        <button
                          onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                          className="p-1 hover:bg-stone-200 text-stone-600 rounded-l-lg"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-bold text-espresso">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                          className="p-1 hover:bg-stone-200 text-stone-600 rounded-r-lg"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-stone-400 hover:text-red-600 p-1 transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-extrabold text-espresso">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer: Coupon Code & Price Breakdown */}
          {cart.length > 0 && (
            <div className="p-4 bg-parchment-50 border-t border-gold-400/40 space-y-3">
              
              {/* Coupon Box */}
              {activeCoupon ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold">{activeCoupon.code}</span>
                      <span className="text-emerald-700 ml-1">
                        (-₹{cartTotals.discount})
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-red-600 hover:text-red-700 font-bold text-xs"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter Coupon (e.g. DIVINE10)"
                    className="flex-1 bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-espresso focus:border-maroon-700 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-stone-800 hover:bg-stone-900 text-amber-200 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                  >
                    Apply
                  </button>
                </form>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-stone-600 pt-2 border-t border-stone-200">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-espresso">₹{cartTotals.subtotal}</span>
                </div>

                {cartTotals.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon Discount</span>
                    <span>-₹{cartTotals.discount}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Standard Express Shipping</span>
                  <span className="font-semibold text-espresso">
                    {cartTotals.shippingFee === 0 ? (
                      <span className="text-emerald-600 font-bold">FREE</span>
                    ) : (
                      `₹${cartTotals.shippingFee}`
                    )}
                  </span>
                </div>

                <div className="flex justify-between pt-2 border-t border-stone-200 text-sm font-extrabold text-maroon-700">
                  <span>Estimated Total</span>
                  <span className="font-serif text-base">₹{cartTotals.total}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleProceedToCheckout}
                className="w-full bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base active:scale-98"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
