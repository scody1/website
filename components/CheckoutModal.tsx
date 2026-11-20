'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { CustomerDetails, Order } from '@/lib/types';
import { formatWhatsAppUrl } from '@/lib/formatters';
import { X, ShieldCheck, CheckCircle2, QrCode, CreditCard, Banknote, Send, Check } from 'lucide-react';

export default function CheckoutModal() {
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    cartTotals,
    state,
    createOrder,
    checkPincode
  } = useStore();

  const [customer, setCustomer] = useState<CustomerDetails>({
    name: '',
    phone: '',
    email: '',
    streetAddress: '',
    landmark: '',
    city: '',
    state: '',
    pincode: ''
  });

  const [paymentMode, setPaymentMode] = useState<'COD' | 'ONLINE_PREPAID'>('COD');
  const [onlineType, setOnlineType] = useState<'UPI_QR' | 'RAZORPAY'>('UPI_QR');
  const [utrNumber, setUtrNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  if (!isCheckoutOpen) return null;

  // Real-time calculation with COD handling fee
  const currentCodFee = (paymentMode === 'COD' && state.paymentShipping.enableCod)
    ? state.paymentShipping.codFee
    : 0;

  const grandTotal = cartTotals.total + currentCodFee;

  const handlePincodeChange = (pin: string) => {
    const cleanPin = pin.replace(/\D/g, '').slice(0, 6);
    setCustomer((prev) => ({ ...prev, pincode: cleanPin }));
    if (cleanPin.length === 6) {
      const res = checkPincode(cleanPin);
      if (res.isServiceable) {
        setCustomer((prev) => ({
          ...prev,
          city: prev.city || res.city.split(' (')[0],
          state: prev.state || res.state
        }));
      }
    }
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer.name || !customer.phone || !customer.streetAddress || !customer.pincode) {
      alert('Please fill in all mandatory delivery address fields.');
      return;
    }

    if (customer.phone.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    let cleanUtr = '';
    if (paymentMode === 'ONLINE_PREPAID' && onlineType === 'UPI_QR') {
      cleanUtr = utrNumber.replace(/\D/g, '').trim();
      if (cleanUtr.length !== 12) {
        alert('Please enter a valid 12-digit UPI UTR / Transaction Reference ID from your payment receipt.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const initialPaymentStatus = paymentMode === 'ONLINE_PREPAID'
        ? (onlineType === 'UPI_QR' ? 'PENDING_VERIFICATION' : 'PAID')
        : 'PENDING';

      const order = createOrder({
        customer,
        items: cart,
        subtotal: cartTotals.subtotal,
        couponDiscount: cartTotals.discount,
        shippingFee: cartTotals.shippingFee,
        codFee: currentCodFee,
        totalAmount: grandTotal,
        paymentMethod: paymentMode,
        paymentStatus: initialPaymentStatus,
        orderStatus: 'New Order',
        utrNumber: cleanUtr || undefined
      });

      setCompletedOrder(order);
    } catch (err) {
      console.error(err);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp Order Confirmation Link
  const generateWhatsAppConfirmationUrl = (order: Order) => {
    const phone = state.storeConfig.whatsapp || state.storeConfig.supportPhone || '';
    const itemsSummary = order.items.map((it) => `${it.name} (Qty: ${it.quantity}) - ₹${it.price * it.quantity}`).join('\n• ');

    let utrNote = '';
    if (order.utrNumber) {
      utrNote = `\n*UPI UTR / Ref:* ${order.utrNumber} (Verification Pending)`;
    }

    const message = `🙏 *Order Confirmation - Rajeshwar Pooja Samagri*\n\n*Order ID:* #${order.id}\n*Customer Name:* ${order.customer.name}\n*Delivery Address:* ${order.customer.streetAddress}, ${order.customer.city}, ${order.customer.pincode}\n*Items Ordered:*\n• ${itemsSummary}\n\n*Total Amount:* ₹${order.totalAmount} (${order.paymentMethod})${utrNote}\n\nPlease share the dispatch & tracking link when ready. Dhanyawad!`;

    return formatWhatsAppUrl(phone, message);
  };

  // Dynamic UPI QR Code generator URL
  const merchantUpi = state.paymentShipping.upiId || 'rajeshwarpooja@upi';
  const merchantName = encodeURIComponent(state.paymentShipping.merchantName || 'Rajeshwar Pooja Samagri');
  const upiIntentUri = `upi://pay?pa=${merchantUpi}&pn=${merchantName}&am=${grandTotal}&cu=INR&tn=Order_Payment`;
  const upiQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiIntentUri)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={() => !completedOrder && setIsCheckoutOpen(false)}
        className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm transition-opacity"
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-6 text-center">
        <div className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white text-left align-middle shadow-2xl transition-all border border-gold-500/50 relative z-10">

          {/* Top Bar */}
          <div className="bg-gradient-to-r from-maroon-700 to-maroon-800 p-5 text-parchment-100 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-gold-300" />
                <span>{completedOrder ? 'Order Confirmation' : 'Sacred Checkout & Delivery'}</span>
              </h3>
              <p className="text-xs text-parchment-200 mt-0.5">
                {completedOrder ? 'Auspicious Blessings! Your order has been placed.' : '100% Secure Pan-India Dispatch Guarantee'}
              </p>
            </div>
            {!completedOrder && (
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-parchment-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-8">

            {/* SUCCESS STATE */}
            {completedOrder ? (
              <div className="text-center space-y-6 py-4 animate-fadeIn">
                <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-400 text-emerald-600 flex items-center justify-center mx-auto shadow-lg animate-bounce">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>

                <div>
                  <h4 className="font-serif text-2xl font-extrabold text-maroon-700">
                    🙏 Jai Shri Ram! Order Placed Successfully
                  </h4>
                  <p className="text-sm font-bold text-gold-600 mt-1">
                    Order Reference ID: #{completedOrder.id}
                  </p>
                  <p className="text-xs text-stone-500 max-w-md mx-auto mt-2 leading-relaxed">
                    Thank you, <strong>{completedOrder.customer.name}</strong>. Your sacred pooja essentials are being prepared for safe packaging. A tracking link will be shared via WhatsApp & SMS.
                  </p>
                </div>

                {/* Order Summary Pill */}
                <div className="bg-parchment-100 border border-gold-400/60 rounded-2xl p-4 text-xs text-left max-w-md mx-auto space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Total Amount:</span>
                    <span className="font-bold text-espresso">₹{completedOrder.totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Payment Mode:</span>
                    <span className="font-bold text-maroon-700">
                      {completedOrder.paymentMethod}
                      {completedOrder.paymentStatus === 'PENDING_VERIFICATION' && ' (Verification Pending)'}
                    </span>
                  </div>
                  {completedOrder.utrNumber && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">UPI Ref / UTR:</span>
                      <span className="font-mono font-bold text-purple-800">{completedOrder.utrNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-stone-500">Delivery Address:</span>
                    <span className="font-semibold text-espresso text-right max-w-[200px] truncate">
                      {completedOrder.customer.streetAddress}, {completedOrder.customer.pincode}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                  <a
                    href={generateWhatsAppConfirmationUrl(completedOrder)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send to WhatsApp</span>
                  </a>

                  <button
                    onClick={() => {
                      setCompletedOrder(null);
                      setIsCheckoutOpen(false);
                    }}
                    className="flex-1 bg-stone-800 hover:bg-stone-900 text-parchment-100 font-bold py-3 px-4 rounded-xl text-xs sm:text-sm transition"
                  >
                    Done & Return to Store
                  </button>
                </div>
              </div>
            ) : (
              /* CHECKOUT FORM */
              <form onSubmit={handleSubmitOrder} className="space-y-6">

                {/* 1. Customer Delivery Details */}
                <div>
                  <h4 className="font-serif text-sm font-bold text-maroon-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-maroon-700 text-white text-[11px] flex items-center justify-center font-bold">1</span>
                    <span>Customer & Delivery Details</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        placeholder="e.g. Rameshwar Sharma"
                        className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-espresso focus:border-maroon-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">10-Digit Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value.replace(/\D/g, '') })}
                        placeholder="e.g. 9876543210"
                        className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-espresso focus:border-maroon-700 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-stone-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        placeholder="For delivery invoice & tracking updates"
                        className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-espresso focus:border-maroon-700 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-stone-700 mb-1">Full Street Address / House / Flat *</label>
                      <input
                        type="text"
                        required
                        value={customer.streetAddress}
                        onChange={(e) => setCustomer({ ...customer, streetAddress: e.target.value })}
                        placeholder="e.g. Flat 402, Shanti Kunj, Temple Road"
                        className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-espresso focus:border-maroon-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">Landmark</label>
                      <input
                        type="text"
                        value={customer.landmark}
                        onChange={(e) => setCustomer({ ...customer, landmark: e.target.value })}
                        placeholder="Near Hanuman Mandir"
                        className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-espresso focus:border-maroon-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">6-Digit Pincode *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={customer.pincode}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        placeholder="e.g. 221001"
                        className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-espresso font-bold focus:border-maroon-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">City / Town *</label>
                      <input
                        type="text"
                        required
                        value={customer.city}
                        onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                        placeholder="City"
                        className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-espresso focus:border-maroon-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-stone-700 mb-1">State *</label>
                      <input
                        type="text"
                        required
                        value={customer.state}
                        onChange={(e) => setCustomer({ ...customer, state: e.target.value })}
                        placeholder="State"
                        className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-espresso focus:border-maroon-700 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Payment Method Selection */}
                <div>
                  <h4 className="font-serif text-sm font-bold text-maroon-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-maroon-700 text-white text-[11px] flex items-center justify-center font-bold">2</span>
                    <span>Select Payment Mode</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">

                    {/* COD Option */}
                    {state.paymentShipping.enableCod && (
                      <div
                        onClick={() => setPaymentMode('COD')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${paymentMode === 'COD'
                          ? 'border-saffron-500 bg-saffron-50/50 shadow-md ring-2 ring-saffron-200'
                          : 'border-stone-200 hover:border-stone-300'
                          }`}
                      >
                        <Banknote className="w-5 h-5 text-saffron-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-espresso text-sm">Cash on Delivery (COD)</p>
                          <p className="text-[11px] text-stone-500 mt-0.5">Pay cash to courier executive upon delivery.</p>
                          {state.paymentShipping.codFee > 0 && (
                            <span className="inline-block mt-1 text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                              +₹{state.paymentShipping.codFee} COD handling fee
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Online Prepaid Option */}
                    {state.paymentShipping.enablePrepaid && (
                      <div
                        onClick={() => setPaymentMode('ONLINE_PREPAID')}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${paymentMode === 'ONLINE_PREPAID'
                          ? 'border-maroon-700 bg-maroon-50/50 shadow-md ring-2 ring-maroon-200'
                          : 'border-stone-200 hover:border-stone-300'
                          }`}
                      >
                        <CreditCard className="w-5 h-5 text-maroon-700 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-espresso text-sm">Online Prepaid (UPI / Card)</p>
                          <p className="text-[11px] text-stone-500 mt-0.5">Instant scan & pay UPI QR or Razorpay.</p>
                          <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            Zero COD fee + Priority Packing
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Online Prepaid Dynamic UPI / Razorpay View */}
                  {paymentMode === 'ONLINE_PREPAID' && (
                    <div className="mt-4 p-4 rounded-2xl bg-parchment-100 border border-gold-400/60 text-xs">
                      <div className="flex gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setOnlineType('UPI_QR')}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs ${onlineType === 'UPI_QR'
                            ? 'bg-maroon-700 text-white'
                            : 'bg-white text-stone-700 border border-stone-300'
                            }`}
                        >
                          Scan UPI QR Code
                        </button>
                        {state.paymentShipping.razorpayKeyId && (
                          <button
                            type="button"
                            onClick={() => setOnlineType('RAZORPAY')}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs ${onlineType === 'RAZORPAY'
                              ? 'bg-maroon-700 text-white'
                              : 'bg-white text-stone-700 border border-stone-300'
                              }`}
                          >
                            Razorpay Gateway
                          </button>
                        )}
                      </div>

                      {onlineType === 'UPI_QR' && (
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-stone-200">
                            <img
                              src={upiQrCodeUrl}
                              alt="UPI QR Code"
                              className="w-36 h-36 rounded-lg border border-gold-400/50 shadow-inner"
                            />
                            <div className="space-y-1 text-center sm:text-left">
                              <p className="font-bold text-espresso">Scan with any UPI App</p>
                              <p className="text-[11px] text-stone-500">Google Pay, PhonePe, Paytm, BHIM</p>
                              <p className="text-xs font-mono font-bold text-maroon-700 pt-1">
                                UPI ID: {merchantUpi}
                              </p>
                              <p className="text-xs font-bold text-espresso">
                                Pay Amount: ₹{grandTotal}
                              </p>
                              <p className="text-[10px] text-stone-400 pt-1">
                                After payment, enter your 12-digit UTR number below to confirm.
                              </p>
                            </div>
                          </div>

                          {/* 12-digit UTR Input */}
                          <div className="bg-white p-3 rounded-xl border border-gold-400/70">
                            <label className="block font-bold text-maroon-700 text-xs mb-1">
                              12-Digit UPI Transaction Reference / UTR Number *
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={12}
                              value={utrNumber}
                              onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                              placeholder="e.g. 431209876543 (from UPI receipt)"
                              className="w-full border-2 border-stone-300 focus:border-maroon-700 rounded-lg px-3 py-2 font-mono text-xs tracking-widest text-espresso font-bold focus:outline-none"
                            />
                            <p className="text-[10px] text-stone-500 mt-1">
                              Mandatory 12-digit reference number found on your UPI app receipt to verify payment.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Price Summary & Submit */}
                <div className="bg-parchment-50 p-4 rounded-2xl border border-gold-400/40 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Subtotal:</span>
                    <span className="font-semibold text-espresso">₹{cartTotals.subtotal}</span>
                  </div>
                  {cartTotals.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span className="font-semibold">-₹{cartTotals.discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Shipping Fee:</span>
                    <span className="font-semibold text-espresso">
                      {cartTotals.shippingFee === 0 ? 'FREE' : `₹${cartTotals.shippingFee}`}
                    </span>
                  </div>
                  {currentCodFee > 0 && (
                    <div className="flex justify-between text-saffron-700">
                      <span>COD Handling Fee:</span>
                      <span className="font-semibold">+₹{currentCodFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-stone-200 text-base font-extrabold text-maroon-700 font-serif">
                    <span>Final Amount:</span>
                    <span>₹{grandTotal}</span>
                  </div>
                </div>

                {/* Submit Order Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base active:scale-98"
                >
                  {isSubmitting ? (
                    <span>Placing Sacred Order...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Confirm & Place Order (₹{grandTotal})</span>
                    </>
                  )}
                </button>

              </form>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
