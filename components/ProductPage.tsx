'use client';

import React, { useState } from 'react';
import { CheckCircle2, ChevronLeft, Minus, Plus, ShieldCheck, ShoppingBag, Star, Truck } from 'lucide-react';
import { useStore } from '@/lib/storeContext';
import { formatINR, formatWhatsAppUrl } from '@/lib/shared/format';
import type { Product, Review } from '@/lib/shared/types';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import CheckoutModal from './CheckoutModal';
import TrackingModal from './TrackingModal';
import PolicyModals from './PolicyModals';
import WriteReviewModal from './WriteReviewModal';
import MobileDock from './MobileDock';
import WhatsAppFloatingButton from './WhatsAppFloatingButton';
import PincodeBar from './PincodeBar';

/** Full product page at /product/<slug> (own URL for sharing and Google). */
export default function ProductPage({ product, reviews }: { product: Product; reviews: Review[] }) {
  const { addToCart, setIsCartOpen, setIsCheckoutOpen, setIsReviewModalOpen, state, cart } = useStore();
  const [qty, setQty] = useState(1);
  const [image, setImage] = useState(0);
  const discount = product.mrp > product.sellingPrice ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100) : 0;
  const inCart = cart.find((c) => c.productId === product.id)?.quantity || 0;
  const outOfStock = product.stock <= 0;

  const buyNow = () => {
    if (inCart === 0) addToCart(product, qty);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-parchment-100 text-espresso">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 pt-6 pb-24">
        <a href="/#catalog-sections" className="inline-flex items-center gap-1 text-xs font-bold text-maroon-700 hover:underline">
          <ChevronLeft className="w-4 h-4" /> Back to all products
        </a>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 mt-4">
          <div>
            <div className="aspect-square bg-white rounded-3xl border border-gold-500/40 overflow-hidden">
              {product.images[image] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[image]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm">No photo</div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {product.images.map((src, i) => (
                  <button key={src + i} onClick={() => setImage(i)} className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 ${i === image ? 'border-maroon-700' : 'border-transparent'}`} aria-label={`Photo ${i + 1}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-saffron-700">{product.category}</p>
            <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-maroon-700 leading-tight">{product.name}</h1>
            {product.reviewCount > 0 ? (
              <a href="#product-reviews" className="flex items-center gap-1.5 text-sm">
                <span className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />)}</span>
                <strong>{product.rating}</strong>
                <span className="text-stone-500">({product.reviewCount} review{product.reviewCount === 1 ? '' : 's'})</span>
              </a>
            ) : (
              <p className="text-xs text-stone-500">No reviews yet</p>
            )}

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-serif font-extrabold text-espresso">{formatINR(product.sellingPrice)}</span>
              {discount > 0 && (
                <>
                  <span className="text-stone-400 line-through">{formatINR(product.mrp)}</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{discount}% off</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-stone-500">Inclusive of all taxes.</p>

            <p className={`text-sm font-bold ${outOfStock ? 'text-rose-700' : product.stock <= 5 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {outOfStock ? 'Out of stock' : product.stock <= 5 ? `Only ${product.stock} left` : 'In stock'}
            </p>

            {!outOfStock && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center border border-stone-300 rounded-xl bg-white">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2.5" aria-label="Decrease quantity"><Minus className="w-4 h-4" /></button>
                  <span className="w-10 text-center font-bold">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="p-2.5" aria-label="Increase quantity"><Plus className="w-4 h-4" /></button>
                </div>
                <button onClick={() => addToCart(product, qty)} className="flex-1 min-w-[140px] bg-maroon-700 hover:bg-maroon-800 text-parchment-100 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Add to cart
                </button>
                <button onClick={buyNow} className="flex-1 min-w-[140px] bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-3 rounded-xl">
                  Buy now
                </button>
              </div>
            )}
            {inCart > 0 && <p className="text-xs text-stone-600">{inCart} in your cart.</p>}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="flex items-center gap-1.5 bg-white border border-gold-400/40 rounded-xl p-2"><Truck className="w-4 h-4 text-saffron-600" /> Pan-India delivery{state.paymentShipping.freeShippingThreshold > 0 ? `, free above ${formatINR(state.paymentShipping.freeShippingThreshold)}` : ''}</span>
              <span className="flex items-center gap-1.5 bg-white border border-gold-400/40 rounded-xl p-2"><ShieldCheck className="w-4 h-4 text-saffron-600" /> {state.paymentShipping.enableCod ? 'Cash on Delivery available' : 'Secure online payment'}</span>
            </div>

            {product.spiritualBenefits.length > 0 && (
              <ul className="space-y-1.5 text-sm">
                {product.spiritualBenefits.map((b) => (
                  <li key={b} className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" /> {b}</li>
                ))}
              </ul>
            )}
            {product.description && <p className="text-sm text-espresso-muted leading-relaxed whitespace-pre-line">{product.description}</p>}
            {(state.storeConfig.whatsapp || state.storeConfig.supportPhone) && (
              <a href={formatWhatsAppUrl(state.storeConfig.whatsapp || state.storeConfig.supportPhone, `Namaste! I have a question about: ${product.name}`)} target="_blank" rel="noopener noreferrer"
                className="inline-block text-sm font-bold text-emerald-700 hover:underline">
                Ask about this product on WhatsApp →
              </a>
            )}
          </div>
        </div>

        <PincodeBar />

        <section id="product-reviews" className="mt-10 bg-white rounded-3xl border border-gold-500/40 p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-serif text-xl font-bold text-maroon-700">Customer reviews</h2>
            <button onClick={() => setIsReviewModalOpen(true)} className="bg-maroon-700 text-parchment-100 font-bold px-4 py-2 rounded-xl text-xs">Write a review</button>
          </div>
          {reviews.length === 0 ? (
            <p className="text-sm text-stone-500">No reviews for this product yet.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {reviews.map((r) => (
                <li key={r.id} className="py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />)}</span>
                    <strong>{r.title || 'Review'}</strong>
                    {r.isVerifiedBuyer && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 rounded-full">Verified buyer</span>}
                  </div>
                  <p className="text-espresso-muted mt-1">{r.comment}</p>
                  <p className="text-[11px] text-stone-400 mt-1">{r.authorName}{r.location ? `, ${r.location}` : ''} · {r.date}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
      <CartDrawer />
      <CheckoutModal />
      <TrackingModal />
      <PolicyModals />
      <WriteReviewModal />
      <MobileDock />
      <WhatsAppFloatingButton />
    </div>
  );
}
