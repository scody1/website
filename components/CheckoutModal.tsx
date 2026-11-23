'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Banknote, Check, CheckCircle2, CreditCard, Loader2, QrCode, Send, ShieldCheck, X } from 'lucide-react';
import { useStore } from '@/lib/storeContext';
import { apiFetch, errorMessage } from '@/lib/api';
import { formatINR, formatWhatsAppUrl } from '@/lib/shared/format';
import type { PaymentMethod, Quote } from '@/lib/shared/types';

interface RazorpayInfo { keyId: string; orderId: string; amount: number; currency: string }
interface CreatedOrder {
  orderNumber: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  status: string;
  razorpay?: RazorpayInfo;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const emptyCustomer = { name: '', phone: '', email: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' };
const inputCls = 'w-full border border-stone-300 rounded-xl px-3 py-2.5 text-espresso focus:border-maroon-700 focus:outline-none';

export default function CheckoutModal() {
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    activeCoupon,
    removeCoupon,
    state,
    clearCart,
    showToast,
    customer: loggedInCustomer,
    openAuthModal
  } = useStore();
  const pay = state.paymentShipping;

  const availableMethods: PaymentMethod[] = [
    ...(pay.enableCod ? (['COD'] as PaymentMethod[]) : []),
    ...(pay.enableRazorpay ? (['RAZORPAY'] as PaymentMethod[]) : []),
    ...(pay.enableUpi ? (['UPI'] as PaymentMethod[]) : [])
  ];

  const [customer, setCustomer] = useState(emptyCustomer);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [utr, setUtr] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<CreatedOrder | null>(null);
  const [paymentPending, setPaymentPending] = useState<CreatedOrder | null>(null);
  const quoteSeq = useRef(0);

  // Pick a sensible default payment method that is actually enabled.
  useEffect(() => {
    if (!method || !availableMethods.includes(method)) setMethod(availableMethods[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay.enableCod, pay.enableRazorpay, pay.enableUpi]);

  // Auto-fill logged-in customer's details and saved delivery address
  useEffect(() => {
    if (loggedInCustomer && isCheckoutOpen) {
      setCustomer((prev) => ({
        name: prev.name || loggedInCustomer.name || '',
        phone: prev.phone || loggedInCustomer.phone || '',
        email: prev.email || loggedInCustomer.email || '',
        addressLine1: prev.addressLine1 || loggedInCustomer.addressLine1 || '',
        addressLine2: prev.addressLine2 || loggedInCustomer.addressLine2 || '',
        city: prev.city || loggedInCustomer.city || '',
        state: prev.state || loggedInCustomer.state || '',
        pincode: prev.pincode || loggedInCustomer.pincode || '',
      }));
    }
  }, [loggedInCustomer, isCheckoutOpen]);

  const cartKey = cart.map((c) => `${c.productId}:${c.quantity}`).join(',');

  const refreshQuote = useCallback(async () => {
    if (cart.length === 0) return;
    const seq = ++quoteSeq.current;
    setQuoting(true);
    try {
      const res = await apiFetch<{ quote: Quote; problems: string[] }>('/api/checkout/quote', {
        method: 'POST',
        json: { items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })), couponCode: activeCoupon?.code ?? null, paymentMethod: method }
      });
      if (seq !== quoteSeq.current) return;
      setQuote(res.quote);
      setProblems(res.problems);
    } catch (err) {
      if (seq === quoteSeq.current) setFormError(errorMessage(err));
    } finally {
      if (seq === quoteSeq.current) setQuoting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, activeCoupon?.code, method]);

  useEffect(() => {
    if (isCheckoutOpen && !completed) refreshQuote();
  }, [isCheckoutOpen, completed, refreshQuote]);

  if (!isCheckoutOpen) return null;

  const close = () => {
    if (submitting) return;
    setIsCheckoutOpen(false);
    if (completed) {
      setCompleted(null);
      setCustomer(emptyCustomer);
      setUtr('');
    }
  };

  const set = (k: keyof typeof emptyCustomer, v: string) => {
    setCustomer((c) => ({ ...c, [k]: v }));
    setFormError(null);
  };

  const finishSuccess = (order: CreatedOrder) => {
    // Google Analytics 4 e-commerce "purchase" event (only when GA is configured).
    try {
      window.gtag?.('event', 'purchase', {
        transaction_id: order.orderNumber,
        value: order.total,
        currency: 'INR',
        items: cart.map((c) => ({ item_id: c.sku, item_name: c.name, price: c.price, quantity: c.quantity }))
      });
    } catch {
      /* analytics must never break checkout */
    }
    setPaymentPending(null);
    setCompleted(order);
    clearCart();
  };

  const openRazorpay = async (order: CreatedOrder) => {
    const rzp = order.razorpay;
    if (!rzp) return;
    const ok = await loadRazorpayScript();
    if (!ok || !window.Razorpay) {
      setPaymentPending(order);
      setFormError('Could not load the payment window. Check your connection and press “Pay now” again.');
      return;
    }
    const rz = new window.Razorpay({
      key: rzp.keyId,
      amount: rzp.amount,
      currency: rzp.currency,
      order_id: rzp.orderId,
      name: state.storeConfig.storeName,
      description: `Order ${order.orderNumber}`,
      prefill: { name: customer.name, contact: customer.phone, email: customer.email || undefined },
      notes: { order_number: order.orderNumber },
      theme: { color: '#6E1414' },
      handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        setSubmitting(true);
        try {
          await apiFetch('/api/payments/razorpay/verify', { method: 'POST', json: resp });
          finishSuccess({ ...order, paymentStatus: 'PAID', status: 'NEW' });
        } catch (err) {
          setPaymentPending(order);
          setFormError(`${errorMessage(err)} If money was deducted, it will be confirmed automatically within a few minutes — track your order to check.`);
        } finally {
          setSubmitting(false);
        }
      },
      modal: {
        ondismiss: () => {
          setPaymentPending(order);
          setFormError('Payment was not completed. Press “Pay now” to try again. Unpaid orders are cancelled automatically after 30 minutes.');
        }
      }
    });
    rz.on('payment.failed', () => {
      setPaymentPending(order);
      setFormError('The payment failed. You can try again with another method.');
    });
    rz.open();
  };

  const retryPayment = async () => {
    if (!paymentPending) return;
    setFormError(null);
    try {
      const { razorpay } = await apiFetch<{ razorpay: RazorpayInfo }>('/api/payments/razorpay/retry', {
        method: 'POST',
        json: { orderNumber: paymentPending.orderNumber, phone: customer.phone }
      });
      await openRazorpay({ ...paymentPending, razorpay });
    } catch (err) {
      setFormError(errorMessage(err));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!method) return setFormError('No payment method is available right now. Please contact the store.');
    if (customer.phone.length !== 10) return setFormError('Enter a valid 10-digit mobile number.');
    if (!/^[1-9][0-9]{5}$/.test(customer.pincode)) return setFormError('Enter a valid 6-digit pincode.');
    if (method === 'UPI' && !/^[0-9]{12}$/.test(utr)) return setFormError('Enter the 12-digit UPI reference (UTR) shown in your payment app after paying.');
    if (problems.length) return setFormError(problems.join(' '));

    setSubmitting(true);
    try {
      const { order } = await apiFetch<{ order: CreatedOrder }>('/api/orders', {
        method: 'POST',
        json: {
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
          couponCode: activeCoupon?.code ?? null,
          paymentMethod: method,
          utrNumber: method === 'UPI' ? utr : null,
          customer
        }
      });
      if (method === 'RAZORPAY') {
        setSubmitting(false);
        await openRazorpay(order);
        return;
      }
      finishSuccess(order);
    } catch (err) {
      const msg = errorMessage(err);
      setFormError(msg);
      if (/coupon/i.test(msg) && activeCoupon) removeCoupon();
      refreshQuote();
    } finally {
      setSubmitting(false);
    }
  };

  const total = quote?.total ?? 0;
  const upiUri = `upi://pay?pa=${encodeURIComponent(pay.upiId)}&pn=${encodeURIComponent(pay.merchantName || state.storeConfig.storeName)}&am=${total}.00&cu=INR&tn=${encodeURIComponent('Pooja order')}`;
  const upiQr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`;

  const whatsappUrl = (o: CreatedOrder) => {
    const phone = state.storeConfig.whatsapp || state.storeConfig.supportPhone;
    const msg = `🙏 Namaste! I placed order #${o.orderNumber} for ${formatINR(o.total)} (${o.paymentMethod}). Name: ${customer.name}.`;
    return formatWhatsAppUrl(phone, msg);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div onClick={close} className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm" />
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white text-left shadow-2xl border border-gold-500/50 relative z-10">
          <div className="bg-gradient-to-r from-maroon-700 to-maroon-800 p-5 text-parchment-100 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-gold-300" />
                <span>{completed ? 'Order Confirmed' : 'Secure Checkout'}</span>
              </h3>
              <p className="text-xs text-parchment-200 mt-0.5">{completed ? 'Thank you for your order!' : 'Pan-India delivery'}</p>
            </div>
            <button onClick={close} className="text-parchment-200 hover:text-white p-1 rounded-lg" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-8">
            {completed ? (
              <div className="text-center space-y-6 py-4 animate-fadeIn">
                <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-400 text-emerald-600 flex items-center justify-center mx-auto shadow-lg">
                  <Check className="w-10 h-10 stroke-[3]" />
                </div>
                <div>
                  <h4 className="font-serif text-2xl font-extrabold text-maroon-700">🙏 Order Placed Successfully</h4>
                  <p className="text-sm font-bold text-gold-600 mt-1">Order number: #{completed.orderNumber}</p>
                  <p className="text-xs text-stone-500 max-w-md mx-auto mt-2 leading-relaxed">
                    Save this order number. You can track your order any time with it and your mobile number.
                    {completed.paymentMethod === 'UPI' && ' We will confirm your UPI payment and then dispatch your parcel.'}
                  </p>
                </div>
                <div className="bg-parchment-100 border border-gold-400/60 rounded-2xl p-4 text-xs max-w-md mx-auto space-y-2 text-left">
                  <div className="flex justify-between"><span className="text-stone-500">Total</span><span className="font-bold">{formatINR(completed.total)}</span></div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Payment</span>
                    <span className="font-bold text-maroon-700">
                      {completed.paymentMethod === 'COD' ? 'Cash on Delivery' : completed.paymentMethod === 'UPI' ? 'UPI — verification pending' : 'Paid online'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                  {(state.storeConfig.whatsapp || state.storeConfig.supportPhone) && (
                    <a href={whatsappUrl(completed)} target="_blank" rel="noopener noreferrer" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" /> <span>Message us on WhatsApp</span>
                    </a>
                  )}
                  <button onClick={close} className="flex-1 bg-stone-800 hover:bg-stone-900 text-parchment-100 font-bold py-3 px-4 rounded-xl text-sm">
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : cart.length === 0 && !paymentPending ? (
              <p className="text-center text-sm text-stone-500 py-10">Your cart is empty.</p>
            ) : paymentPending ? (
              <div className="text-center space-y-4 py-6">
                <p className="font-serif text-lg font-bold text-maroon-700">Order #{paymentPending.orderNumber} is waiting for payment</p>
                {formError && <p className="text-xs text-red-600 font-semibold">{formError}</p>}
                <button onClick={retryPayment} disabled={submitting} className="bg-saffron-500 hover:bg-saffron-600 disabled:opacity-60 text-white font-bold py-3 px-6 rounded-xl text-sm">
                  {submitting ? 'Confirming payment…' : `Pay now ${formatINR(paymentPending.total)}`}
                </button>
                <p className="text-[11px] text-stone-500">Your items are reserved for 30 minutes.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {loggedInCustomer ? (
                  <div className="bg-gold-50/90 border border-gold-400/70 rounded-2xl p-3 flex items-center justify-between text-xs text-espresso">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                      <span>
                        Logged in as <strong>{loggedInCustomer.name}</strong> ({loggedInCustomer.phone}) — this order will be saved to your account.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-parchment-200 border border-gold-400/40 rounded-2xl p-3 flex items-center justify-between text-xs text-stone-700">
                    <span>Have an account with us?</span>
                    <button
                      type="button"
                      onClick={() => openAuthModal('login')}
                      className="text-maroon-700 font-bold hover:underline"
                    >
                      Sign in to auto-fill details →
                    </button>
                  </div>
                )}

                <div>
                  <h4 className="font-serif text-sm font-bold text-maroon-700 uppercase tracking-wider mb-3">1. Delivery details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label className="block">
                      <span className="block font-semibold text-stone-700 mb-1">Full name *</span>
                      <input required autoComplete="name" value={customer.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
                    </label>
                    <label className="block">
                      <span className="block font-semibold text-stone-700 mb-1">Mobile number *</span>
                      <input required type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={customer.phone}
                        onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" className={inputCls} />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="block font-semibold text-stone-700 mb-1">Email (for order updates)</span>
                      <input type="email" autoComplete="email" value={customer.email} onChange={(e) => set('email', e.target.value)} className={inputCls} />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="block font-semibold text-stone-700 mb-1">House / flat / street *</span>
                      <input required autoComplete="address-line1" value={customer.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} className={inputCls} />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="block font-semibold text-stone-700 mb-1">Area / landmark</span>
                      <input autoComplete="address-line2" value={customer.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} className={inputCls} />
                    </label>
                    <label className="block">
                      <span className="block font-semibold text-stone-700 mb-1">Pincode *</span>
                      <input required inputMode="numeric" autoComplete="postal-code" maxLength={6} value={customer.pincode}
                        onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} className={inputCls} />
                    </label>
                    <label className="block">
                      <span className="block font-semibold text-stone-700 mb-1">City *</span>
                      <input required autoComplete="address-level2" value={customer.city} onChange={(e) => set('city', e.target.value)} className={inputCls} />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="block font-semibold text-stone-700 mb-1">State *</span>
                      <input required autoComplete="address-level1" value={customer.state} onChange={(e) => set('state', e.target.value)} className={inputCls} />
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="font-serif text-sm font-bold text-maroon-700 uppercase tracking-wider mb-3">2. Payment</h4>
                  {availableMethods.length === 0 ? (
                    <p className="text-xs text-red-600 font-semibold">Online ordering is temporarily unavailable. Please contact us on WhatsApp.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {availableMethods.map((m) => {
                        const disabled = m === 'COD' && quote !== null && !quote.codAllowed;
                        const Icon = m === 'COD' ? Banknote : m === 'RAZORPAY' ? CreditCard : QrCode;
                        return (
                          <button type="button" key={m} disabled={disabled} onClick={() => setMethod(m)}
                            className={`p-3 rounded-2xl border-2 text-left transition-all flex items-start gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                              method === m ? 'border-saffron-500 bg-saffron-50/50 ring-2 ring-saffron-200' : 'border-stone-200 hover:border-stone-300'
                            }`}>
                            <Icon className="w-5 h-5 text-maroon-700 flex-shrink-0" />
                            <span>
                              <span className="block font-bold text-espresso text-sm">
                                {m === 'COD' ? 'Cash on Delivery' : m === 'RAZORPAY' ? 'Card / UPI / Netbanking' : 'Pay by UPI QR'}
                              </span>
                              <span className="block text-[11px] text-stone-500 mt-0.5">
                                {m === 'COD'
                                  ? disabled ? `Only for orders up to ₹${pay.codMaxOrderValue}` : pay.codFee > 0 ? `+₹${pay.codFee} COD fee` : 'Pay when it arrives'
                                  : m === 'RAZORPAY' ? 'Secure payment via Razorpay' : 'Scan, pay, enter UTR'}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {method === 'UPI' && quote && (
                    <div className="mt-4 p-4 rounded-2xl bg-parchment-100 border border-gold-400/60 text-xs space-y-3">
                      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-stone-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={upiQr} alt="UPI payment QR code" className="w-36 h-36 rounded-lg border border-gold-400/50" />
                        <div className="space-y-1 text-center sm:text-left">
                          <p className="font-bold text-espresso">Scan with any UPI app</p>
                          <p className="font-mono font-bold text-maroon-700">UPI ID: {pay.upiId}</p>
                          <p className="font-bold text-espresso text-sm">Pay exactly {formatINR(total)}</p>
                          <a href={upiUri} className="inline-block sm:hidden mt-1 text-saffron-700 font-bold underline">Open UPI app</a>
                        </div>
                      </div>
                      <label className="block bg-white p-3 rounded-xl border border-gold-400/70">
                        <span className="block font-bold text-maroon-700 mb-1">12-digit UPI reference / UTR *</span>
                        <input inputMode="numeric" maxLength={12} value={utr} onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                          placeholder="Shown in your UPI app after paying" className="w-full border-2 border-stone-300 focus:border-maroon-700 rounded-lg px-3 py-2 font-mono tracking-widest font-bold focus:outline-none" />
                        <span className="block text-[10px] text-stone-500 mt-1">We dispatch after we confirm the payment in our bank account.</span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="bg-parchment-50 p-4 rounded-2xl border border-gold-400/40 space-y-2 text-xs">
                  {quoting && !quote ? (
                    <p className="flex items-center gap-2 text-stone-500"><Loader2 className="w-4 h-4 animate-spin" /> Calculating…</p>
                  ) : quote ? (
                    <>
                      <div className="flex justify-between"><span className="text-stone-600">Subtotal</span><span className="font-semibold">{formatINR(quote.subtotal)}</span></div>
                      {quote.discount > 0 && (
                        <div className="flex justify-between text-emerald-700"><span>Coupon {quote.couponCode}</span><span className="font-semibold">−{formatINR(quote.discount)}</span></div>
                      )}
                      {quote.couponError && <p className="text-amber-700">{quote.couponError}</p>}
                      <div className="flex justify-between"><span>Shipping</span><span className="font-semibold">{quote.shippingFee === 0 ? 'FREE' : formatINR(quote.shippingFee)}</span></div>
                      {quote.codFee > 0 && <div className="flex justify-between text-saffron-700"><span>COD fee</span><span className="font-semibold">+{formatINR(quote.codFee)}</span></div>}
                      <div className="flex justify-between pt-2 border-t border-stone-200 text-base font-extrabold text-maroon-700 font-serif">
                        <span>Total</span><span>{formatINR(quote.total)}</span>
                      </div>
                    </>
                  ) : null}
                  {problems.map((p) => <p key={p} className="text-red-600 font-semibold">{p}</p>)}
                </div>

                {formError && <p className="text-xs text-red-600 font-bold" role="alert">{formError}</p>}

                <button type="submit" disabled={submitting || !quote || !method || problems.length > 0}
                  className="w-full bg-saffron-500 hover:bg-saffron-600 disabled:bg-stone-400 text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 text-sm sm:text-base">
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /><span>Placing order…</span></>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5" /><span>{method === 'RAZORPAY' ? 'Continue to payment' : 'Place order'} {quote ? `(${formatINR(quote.total)})` : ''}</span></>
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
