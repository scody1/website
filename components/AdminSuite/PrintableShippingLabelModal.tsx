'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { Order } from '@/lib/types';
import Logo from '../Logo';
import { X, Printer, Truck, FileText } from 'lucide-react';

interface PrintableShippingLabelModalProps {
  order: Order | null;
  onClose: () => void;
}

export default function PrintableShippingLabelModal({ order, onClose }: PrintableShippingLabelModalProps) {
  const { state } = useStore();
  const [activeDocType, setActiveDocType] = useState<'LABEL_AND_INVOICE' | 'LABEL_ONLY' | 'INVOICE_ONLY'>('LABEL_AND_INVOICE');

  if (!order) return null;

  const awb = order.courierBooking?.awbCode || `AWB-${order.id}`;
  const courierName = order.courierBooking?.courierPartner || state.courierConfig.primaryCourier || 'Shiprocket Express';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm transition-opacity print:hidden"
      />

      <div className="flex min-h-full items-center justify-center p-2 sm:p-4 text-center print:p-0">
        <div className="w-full max-w-4xl transform overflow-hidden rounded-3xl bg-white text-left align-middle shadow-2xl transition-all border border-gold-500/50 relative z-10 print:border-none print:shadow-none print:rounded-none">
          
          {/* Header Controls (Hidden during print) */}
          <div className="bg-gradient-to-r from-maroon-700 to-maroon-800 p-4 text-parchment-100 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-3">
              <Printer className="w-5 h-5 text-gold-300" />
              <div>
                <h3 className="font-serif text-base font-bold">Print Courier Documents</h3>
                <p className="text-[11px] text-parchment-200">Order #{order.id} • AWB: {awb}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={activeDocType}
                onChange={(e) => setActiveDocType(e.target.value as any)}
                className="bg-stone-900 border border-gold-400/50 text-amber-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="LABEL_AND_INVOICE">Label + Tax Invoice</option>
                <option value="LABEL_ONLY">4×6 Thermal Label Only</option>
                <option value="INVOICE_ONLY">Tax Invoice Only</option>
              </select>

              <button
                onClick={handlePrint}
                className="bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Print Now</span>
              </button>

              <button
                onClick={onClose}
                className="text-parchment-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Area */}
          <div id="printableDocArea" className="p-6 sm:p-8 space-y-8 bg-white text-espresso">
            
            {/* 1. 4×6 THERMAL SHIPPING LABEL */}
            {(activeDocType === 'LABEL_AND_INVOICE' || activeDocType === 'LABEL_ONLY') && (
              <div className="border-2 border-dashed border-stone-800 rounded-xl p-5 max-w-lg mx-auto bg-white font-sans text-xs space-y-3">
                {/* Top COD / Prepaid Banner */}
                <div
                  className={`text-center py-2 px-3 rounded font-black text-sm uppercase tracking-widest ${
                    order.paymentMethod === 'COD'
                      ? 'bg-black text-white'
                      : 'bg-stone-200 text-stone-900 border border-black'
                  }`}
                >
                  {order.paymentMethod === 'COD' ? `CASH ON DELIVERY (COLLECT ₹${order.totalAmount})` : 'PREPAID ORDER (DO NOT COLLECT CASH)'}
                </div>

                {/* Logistics Bar & Courier Name */}
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-600">Carrier Partner:</span>
                    <h4 className="font-extrabold text-base leading-none text-black">{courierName}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-stone-600">Routing Pincode:</span>
                    <h4 className="font-mono font-black text-lg text-black leading-none">{order.customer.pincode}</h4>
                  </div>
                </div>

                {/* Simulated Barcode */}
                <div className="py-2 text-center">
                  <div className="h-14 w-full bg-repeating-linear-gradient flex items-center justify-center border border-black">
                    <div className="barcode-bars w-full h-12" />
                  </div>
                  <span className="font-mono font-bold tracking-widest text-xs text-black block mt-1">
                    * {awb} *
                  </span>
                </div>

                {/* Addresses Grid */}
                <div className="grid grid-cols-2 gap-3 border-t-2 border-black pt-2 text-[11px]">
                  {/* Destination */}
                  <div className="border-r pr-2 border-stone-300">
                    <span className="text-[10px] uppercase font-black text-black block">DELIVER TO:</span>
                    <p className="font-bold text-black">{order.customer.name}</p>
                    <p className="text-stone-700 leading-tight mt-0.5">
                      {order.customer.streetAddress}
                      {order.customer.landmark ? `, ${order.customer.landmark}` : ''}
                    </p>
                    <p className="font-bold text-black mt-1">
                      {order.customer.city}, {order.customer.state} - {order.customer.pincode}
                    </p>
                    <p className="font-mono font-bold mt-1">Phone: {order.customer.phone}</p>
                  </div>

                  {/* Return / Pickup Hub */}
                  <div className="pl-1">
                    <span className="text-[10px] uppercase font-black text-black block">RETURN IF UNDELIVERED:</span>
                    <p className="font-bold text-black">{state.pickupAddress.contactName || state.storeConfig.storeName}</p>
                    <p className="text-stone-700 leading-tight mt-0.5">
                      {[state.pickupAddress.shopHouseNo, state.pickupAddress.street].filter(Boolean).join(', ') || 'Dispatch Hub'}
                    </p>
                    <p className="font-bold text-black mt-1">
                      {state.pickupAddress.city || 'Varanasi'}, {state.pickupAddress.state} - {state.pickupAddress.pincode}
                    </p>
                    <p className="font-mono text-stone-600 mt-0.5">Support: {state.storeConfig.supportPhone || state.storeConfig.whatsapp}</p>
                  </div>
                </div>

                {/* Micro Item Summary */}
                <div className="border-t border-stone-300 pt-2 text-[10px] text-stone-600 flex justify-between">
                  <span>Order: #{order.id} (Items: {order.items.reduce((s, i) => s + i.quantity, 0)})</span>
                  <span>Dimensions: 20×15×12 cm (0.8 kg)</span>
                </div>
              </div>
            )}

            {/* Page break during print */}
            <div className="print:page-break-after" />

            {/* 2. GST / NON-GST TAX INVOICE */}
            {(activeDocType === 'LABEL_AND_INVOICE' || activeDocType === 'INVOICE_ONLY') && (
              <div className="border border-stone-300 rounded-xl p-6 bg-white max-w-2xl mx-auto space-y-6">
                
                {/* Top Invoice Header with Custom Religious Crest SVG Emblem */}
                <div className="flex items-start justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <Logo size="md" />
                  </div>
                  <div className="text-right">
                    <h3 className="font-serif text-lg font-extrabold text-maroon-700">
                      {state.pickupAddress.billingType === 'GST' ? 'TAX INVOICE' : 'BILL OF SUPPLY'}
                    </h3>
                    <p className="font-mono text-xs text-stone-600">Invoice #{order.id}</p>
                    <p className="text-[11px] text-stone-500">Date: {new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                    {state.pickupAddress.billingType === 'GST' && state.pickupAddress.gstin && (
                      <p className="font-mono text-[11px] text-stone-700 font-bold mt-0.5">GSTIN: {state.pickupAddress.gstin}</p>
                    )}
                  </div>
                </div>

                {/* Bill From & Bill To */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-stone-500 uppercase text-[10px]">Sold By (Dispatched From):</span>
                    <p className="font-bold text-espresso">{state.pickupAddress.businessLegalName || state.storeConfig.storeName}</p>
                    <p className="text-stone-600">{[state.pickupAddress.shopHouseNo, state.pickupAddress.street].filter(Boolean).join(', ')}</p>
                    <p className="text-stone-600">{state.pickupAddress.city}, {state.pickupAddress.state} - {state.pickupAddress.pincode}</p>
                    <p className="text-stone-600">Email: {state.storeConfig.supportEmail}</p>
                  </div>

                  <div>
                    <span className="font-bold text-stone-500 uppercase text-[10px]">Customer (Billed To):</span>
                    <p className="font-bold text-espresso">{order.customer.name}</p>
                    <p className="text-stone-600">{order.customer.streetAddress}</p>
                    <p className="text-stone-600">{order.customer.city}, {order.customer.state} - {order.customer.pincode}</p>
                    <p className="font-mono text-stone-600">Phone: {order.customer.phone}</p>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-left text-xs border border-stone-200">
                  <thead className="bg-stone-100 font-bold text-espresso">
                    <tr>
                      <th className="p-2 border">#</th>
                      <th className="p-2 border">Item Description</th>
                      <th className="p-2 border">Qty</th>
                      <th className="p-2 border">Unit Price</th>
                      <th className="p-2 border text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => (
                      <tr key={idx} className="border">
                        <td className="p-2 border text-center">{idx + 1}</td>
                        <td className="p-2 border font-semibold">{item.name}</td>
                        <td className="p-2 border text-center">{item.quantity}</td>
                        <td className="p-2 border">₹{item.price}</td>
                        <td className="p-2 border text-right">₹{item.price * item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Calculations Summary */}
                <div className="flex justify-end text-xs">
                  <div className="w-64 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-stone-600">Subtotal:</span>
                      <span className="font-semibold">₹{order.subtotal}</span>
                    </div>
                    {order.couponDiscount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Coupon Discount:</span>
                        <span className="font-semibold">-₹{order.couponDiscount}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-stone-600">Shipping Charges:</span>
                      <span className="font-semibold">{order.shippingFee === 0 ? 'FREE' : `₹${order.shippingFee}`}</span>
                    </div>
                    {order.codFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-stone-600">COD Fee:</span>
                        <span className="font-semibold">₹{order.codFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t text-sm font-bold text-maroon-700">
                      <span>Grand Total:</span>
                      <span>₹{order.totalAmount}</span>
                    </div>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="border-t pt-4 text-[10px] text-stone-500 text-center">
                  <p>This is a computer-generated invoice for Sacred Pooja Essentials & Brassware. No physical signature required.</p>
                  <p className="mt-0.5">Thank you for your devotional patronage. May Lord Ram & Mahalakshmi bless your home!</p>
                </div>

              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
