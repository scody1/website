'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import Header from '@/components/Header';
import HeroBanner from '@/components/HeroBanner';
import PincodeBar from '@/components/PincodeBar';
import CategoryCarousel from '@/components/CategoryCarousel';
import SpiritualBento from '@/components/SpiritualBento';
import BestsellerSpotlight from '@/components/BestsellerSpotlight';
import ProductSections from '@/components/ProductSections';
import DevotionalBanner from '@/components/DevotionalBanner';
import ReviewsSection from '@/components/ReviewsSection';
import OrderTrackerSection from '@/components/OrderTrackerSection';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import CheckoutModal from '@/components/CheckoutModal';
import TrackingModal from '@/components/TrackingModal';
import ProductQuickViewModal from '@/components/ProductQuickViewModal';
import WriteReviewModal from '@/components/WriteReviewModal';
import PolicyModals from '@/components/PolicyModals';
import MobileDock from '@/components/MobileDock';
import WhatsAppFloatingButton from '@/components/WhatsAppFloatingButton';
import AdminSuite from '@/components/AdminSuite';

export default function Home() {
  const { isAdminOpen, state } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Dynamic JSON-LD Structured Data Schema for Products & Organization
  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: state.storeConfig.storeName,
    description: state.storeConfig.heroSubheadline,
    telephone: state.storeConfig.supportPhone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: state.pickupAddress.street,
      addressLocality: state.pickupAddress.city,
      postalCode: state.pickupAddress.pincode,
      addressCountry: 'IN',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Pooja Samagri & Divine Brassware',
      itemListElement: state.products.map((p) => ({
        '@type': 'Product',
        name: p.name,
        image: p.images[0],
        description: p.description,
        sku: p.sku,
        offers: {
          '@type': 'Offer',
          price: p.sellingPrice,
          priceCurrency: 'INR',
          availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      })),
    },
  };

  const validGaId = state.policiesSeo?.gaMeasurementId && /^G-[A-Z0-9]+$/i.test(state.policiesSeo.gaMeasurementId.trim())
    ? state.policiesSeo.gaMeasurementId.trim()
    : null;

  return (
    <>
      {/* Dynamic JSON-LD injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
      />

      {/* Dynamic GA4 tag if safely validated */}
      {validGaId && (
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${validGaId}`}
        />
      )}

      {/* VIEW SWITCHER: ADMIN SUITE VS CUSTOMER STOREFRONT */}
      {isAdminOpen ? (
        <AdminSuite />
      ) : (
        <div className="min-h-screen flex flex-col bg-parchment-100 text-espresso">

          {/* 1. Header (Announcement + Floating Glass Header) */}
          <Header />

          {/* 2. Main Storefront Flow */}
          <main className="flex-1">
            {/* Hero Carousel Banner */}
            <HeroBanner />

            {/* Live 6-Digit Pincode Serviceability Bar */}
            <PincodeBar />

            {/* Shop By Category (Circular Gold-Rimmed Icon Carousel) */}
            <CategoryCarousel
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Complete Spiritual Ecosystem (Architectural Bento Grid) */}
            <SpiritualBento />

            {/* #1 Bestseller Spotlight Card (Modeled after Dhoop Dani Burner) */}
            <BestsellerSpotlight />

            {/* Dynamic Sectioned Product Collections */}
            <ProductSections activeCategoryFilter={selectedCategory} />

            {/* Devotional Campaign Banner ("Ek Diya, Ram Ke Naam") */}
            <DevotionalBanner />

            {/* Verified Customer Reviews & Ratings Wall */}
            <ReviewsSection />

            {/* Live 5-Step Order Tracking Section */}
            <OrderTrackerSection />
          </main>

          {/* 3. Luxury Spiritual Footer */}
          <Footer />

          {/* 4. Drawers & Modals */}
          <CartDrawer />
          <CheckoutModal />
          <TrackingModal />
          <ProductQuickViewModal />
          <WriteReviewModal />
          <PolicyModals />

          {/* 5. Mobile Floating Dock & Floating WhatsApp Chat */}
          <MobileDock />
          <WhatsAppFloatingButton />
        </div>
      )}
    </>
  );
}
