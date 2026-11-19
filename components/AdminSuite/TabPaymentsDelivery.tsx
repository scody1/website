'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { PaymentShippingConfig, Coupon } from '@/lib/types';
import { Save, Tag, IndianRupee, Plus, Trash2, ToggleLeft, ToggleRight, QrCode } from 'lucide-react';

export default function TabPaymentsDelivery() {
  const {
    state,
    updatePaymentShipping,
    addCoupon,
    toggleCoupon,
    deleteCoupon
  } = useStore();

  const [cfg, setCfg] = useState<PaymentShippingConfig>({ ...state.paymentShipping });
  
  // Coupon creation form
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [newCouponVal, setNewCouponVal] = useState(10);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState(500);
  const [newCouponDesc, setNewCouponDesc] = useState('');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updatePaymentShipping(cfg);
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || newCouponVal <= 0) {
      alert('Please enter a valid coupon code and discount value.');
      return;
    }

    addCoupon({
      code: newCouponCode.trim().toUpperCase(),
      discountType: newCouponType,
      discountValue: newCouponVal,
      minOrderValue: newCouponMinOrder,
      isActive: true,
      description: newCouponDesc || `${newCouponVal}${newCouponType === 'PERCENT' ? '%' : '₹'} off above ₹${newCouponMinOrder}`
    });

    setNewCouponCode('');
    setNewCouponVal(10);
    setNewCouponDesc('');
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Delivery Charges & Payment Modes Form */}
      <form onSubmit={handleSaveConfig} className="bg-white p-6 rounded-3xl border border-gold-500/40 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <h3 className="font-serif text-base font-bold text-maroon-700 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-saffron-600" />
            <span>Delivery Fees & Payment Gateways Configuration</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Standard Shipping Fee (₹) *</label>
            <input
              type="number"
              required
              value={cfg.standardShippingFee}
              onChange={(e) => setCfg({ ...cfg, standardShippingFee: Number(e.target.value) })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
            />
            <p className="text-[10px] text-stone-400 mt-0.5">Applied to orders below free shipping threshold.</p>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Free Express Shipping Threshold (₹) *</label>
            <input
              type="number"
              required
              value={cfg.freeShippingThreshold}
              onChange={(e) => setCfg({ ...cfg, freeShippingThreshold: Number(e.target.value) })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-emerald-700 font-bold focus:border-maroon-700 focus:outline-none"
            />
            <p className="text-[10px] text-stone-400 mt-0.5">Orders at or above this value get 100% FREE delivery.</p>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Extra COD Handling Fee (₹)</label>
            <input
              type="number"
              value={cfg.codFee}
              onChange={(e) => setCfg({ ...cfg, codFee: Number(e.target.value) })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
            />
            <p className="text-[10px] text-stone-400 mt-0.5">Applied to checkout total when COD is chosen.</p>
          </div>
        </div>

        {/* Payment Gateways */}
        <div className="pt-4 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          
          {/* COD Toggle */}
          <div className="p-4 bg-parchment-50 rounded-2xl border border-gold-300/40 flex items-center justify-between">
            <div>
              <p className="font-bold text-espresso">Cash on Delivery (COD)</p>
              <p className="text-[11px] text-stone-500">Allow customers to pay cash to courier executive.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.enableCod}
                onChange={(e) => setCfg({ ...cfg, enableCod: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-saffron-500" />
            </label>
          </div>

          {/* Prepaid Toggle */}
          <div className="p-4 bg-parchment-50 rounded-2xl border border-gold-300/40 flex items-center justify-between">
            <div>
              <p className="font-bold text-espresso">Online Prepaid (UPI / Card)</p>
              <p className="text-[11px] text-stone-500">Enable Dynamic UPI QR and Razorpay.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.enablePrepaid}
                onChange={(e) => setCfg({ ...cfg, enablePrepaid: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-maroon-700" />
            </label>
          </div>

          {/* Merchant UPI ID for Dynamic QR */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Admin / Merchant UPI ID (for Scan & Pay QR)
            </label>
            <input
              type="text"
              value={cfg.upiId || ''}
              onChange={(e) => setCfg({ ...cfg, upiId: e.target.value })}
              placeholder="e.g. rajeshwarpooja@okaxis"
              className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono text-espresso focus:border-maroon-700 focus:outline-none"
            />
            <p className="text-[10px] text-stone-400 mt-0.5">Used to generate dynamic UPI QR code on checkout.</p>
          </div>

          {/* Razorpay Key ID */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Razorpay Key ID (Optional)
            </label>
            <input
              type="text"
              value={cfg.razorpayKeyId || ''}
              onChange={(e) => setCfg({ ...cfg, razorpayKeyId: e.target.value })}
              placeholder="rzp_live_..."
              className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono text-espresso focus:border-maroon-700 focus:outline-none"
            />
            <p className="text-[10px] text-stone-400 mt-0.5">Enter live Razorpay Key to trigger modal card/netbanking payments.</p>
          </div>

        </div>

        <div className="pt-3">
          <button
            type="submit"
            className="w-full bg-maroon-700 hover:bg-maroon-800 text-parchment-100 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
          >
            <Save className="w-4 h-4 text-gold-300" />
            <span>Save Payment & Delivery Rules</span>
          </button>
        </div>
      </form>

      {/* 2. Dynamic Coupon Code Manager */}
      <div className="bg-white p-6 rounded-3xl border border-gold-500/40 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h3 className="font-serif text-base font-bold text-maroon-700 flex items-center gap-2">
              <Tag className="w-5 h-5 text-saffron-600" />
              <span>Discount Coupons & Promo Codes</span>
            </h3>
            <p className="text-xs text-stone-500">Create promotional discount codes for festivals and special devotees.</p>
          </div>
        </div>

        {/* Create Coupon Form */}
        <form onSubmit={handleCreateCoupon} className="bg-parchment-50 p-4 rounded-2xl border border-gold-300/40 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs items-end">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Promo Code *</label>
            <input
              type="text"
              required
              value={newCouponCode}
              onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
              placeholder="DIWALI20"
              className="w-full border border-stone-300 rounded-xl px-3 py-2 uppercase font-mono font-bold text-espresso"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Discount Type</label>
            <select
              value={newCouponType}
              onChange={(e) => setNewCouponType(e.target.value as 'PERCENT' | 'FLAT')}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso"
            >
              <option value="PERCENT">Percentage (%) OFF</option>
              <option value="FLAT">Flat (₹) OFF</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Discount Value *</label>
            <input
              type="number"
              required
              value={newCouponVal}
              onChange={(e) => setNewCouponVal(Number(e.target.value))}
              placeholder="10"
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Min Order Value (₹)</label>
            <input
              type="number"
              value={newCouponMinOrder}
              onChange={(e) => setNewCouponMinOrder(Number(e.target.value))}
              placeholder="500"
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-2.5 rounded-xl transition shadow flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Coupon</span>
            </button>
          </div>
        </form>

        {/* Existing Coupons Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-espresso">
            <thead className="bg-parchment-100 text-maroon-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Coupon Code</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Min Order</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {state.coupons.map((cp) => (
                <tr key={cp.id} className="hover:bg-parchment-50/50 transition">
                  <td className="p-3 font-mono font-bold text-maroon-700">
                    {cp.code}
                    {cp.description && (
                      <span className="block text-[10px] text-stone-400 font-normal">{cp.description}</span>
                    )}
                  </td>

                  <td className="p-3 font-bold text-emerald-700">
                    {cp.discountType === 'PERCENT' ? `${cp.discountValue}% OFF` : `₹${cp.discountValue} FLAT OFF`}
                  </td>

                  <td className="p-3 font-semibold">
                    ₹{cp.minOrderValue}
                  </td>

                  <td className="p-3">
                    <button
                      onClick={() => toggleCoupon(cp.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        cp.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {cp.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>

                  <td className="p-3 text-right">
                    <button
                      onClick={() => deleteCoupon(cp.id)}
                      className="p-1 hover:bg-red-50 text-red-600 rounded-lg"
                      title="Delete Coupon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
