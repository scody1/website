'use client';

import React, { useState } from 'react';
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
import CustomerAuthModal from '@/components/CustomerAuthModal';
import AccountDrawer from '@/components/AccountDrawer';
import CheckoutModal from '@/components/CheckoutModal';
import TrackingModal from '@/components/TrackingModal';
import ProductQuickViewModal from '@/components/ProductQuickViewModal';
import WriteReviewModal from '@/components/WriteReviewModal';
import PolicyModals from '@/components/PolicyModals';
import MobileDock from '@/components/MobileDock';
import WhatsAppFloatingButton from '@/components/WhatsAppFloatingButton';

export default function Storefront() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  return (
    <div className="min-h-screen flex flex-col bg-parchment-100 text-espresso">
      <Header />
      <main className="flex-1">
        <HeroBanner />
        <PincodeBar />
        <CategoryCarousel selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
        <SpiritualBento />
        <BestsellerSpotlight />
        <ProductSections activeCategoryFilter={selectedCategory} />
        <DevotionalBanner />
        <ReviewsSection />
        <OrderTrackerSection />
      </main>
      <Footer />

      <CartDrawer />
      <CustomerAuthModal />
      <AccountDrawer />
      <CheckoutModal />
      <TrackingModal />
      <ProductQuickViewModal />
      <WriteReviewModal />
      <PolicyModals />

      <MobileDock />
      <WhatsAppFloatingButton />
    </div>
  );
}
