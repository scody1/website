'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { Order } from '@/lib/types';
import AdminPasscodeModal from './AdminPasscodeModal';
import AdminHeader from './AdminHeader';
import TabChecklist from './TabChecklist';
import TabStoreSetup from './TabStoreSetup';
import TabProducts from './TabProducts';
import TabOrders from './TabOrders';
import TabCourier from './TabCourier';
import TabAnalytics from './TabAnalytics';
import TabPaymentsDelivery from './TabPaymentsDelivery';
import TabSeoPolicies from './TabSeoPolicies';
import TabSupabaseSync from './TabSupabaseSync';
import PrintableShippingLabelModal from './PrintableShippingLabelModal';
import {
  CheckSquare,
  Building2,
  Package,
  ShoppingCart,
  Truck,
  TrendingUp,
  CreditCard,
  Globe,
  Cloud
} from 'lucide-react';

export default function AdminSuite() {
  const { adminUnlocked } = useStore();
  const [activeTab, setActiveTab] = useState<string>('checklist');
  const [selectedPrintOrder, setSelectedPrintOrder] = useState<Order | null>(null);

  if (!adminUnlocked) {
    return <AdminPasscodeModal />;
  }

  const tabs = [
    { id: 'checklist', label: 'Setup Checklist', icon: CheckSquare },
    { id: 'storeSetup', label: '1. Store & Pickup Address', icon: Building2 },
    { id: 'products', label: '2. Products & Stock', icon: Package },
    { id: 'orders', label: '3. Orders & Customers', icon: ShoppingCart },
    { id: 'courier', label: '4. Shiprocket & Courier', icon: Truck },
    { id: 'analytics', label: '5. Sales & Profit Analytics', icon: TrendingUp },
    { id: 'payments', label: '6. Delivery & Coupons', icon: CreditCard },
    { id: 'seo', label: '7. SEO & Policies', icon: Globe },
    { id: 'supabase', label: '8. Cloud Database Sync', icon: Cloud }
  ];

  return (
    <div className="min-h-screen bg-stone-100 text-espresso pb-16">
      
      {/* Top Bar */}
      <AdminHeader activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Admin Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-6">
        
        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all shadow-sm ${
                  isActive
                    ? 'bg-maroon-700 text-parchment-100 shadow-md ring-2 ring-gold-400'
                    : 'bg-white text-stone-700 hover:bg-stone-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-gold-300' : 'text-stone-500'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="mt-4">
          {activeTab === 'checklist' && <TabChecklist onNavigateTab={setActiveTab} />}
          {activeTab === 'storeSetup' && <TabStoreSetup />}
          {activeTab === 'products' && <TabProducts />}
          {activeTab === 'orders' && (
            <TabOrders
              onOpenPrintModal={(ord) => setSelectedPrintOrder(ord)}
            />
          )}
          {activeTab === 'courier' && (
            <TabCourier
              onOpenPrintModal={(ord) => setSelectedPrintOrder(ord)}
            />
          )}
          {activeTab === 'analytics' && <TabAnalytics />}
          {activeTab === 'payments' && <TabPaymentsDelivery />}
          {activeTab === 'seo' && <TabSeoPolicies />}
          {activeTab === 'supabase' && <TabSupabaseSync />}
        </div>

      </div>

      {/* Printable 4×6 Shipping Label & Tax Invoice Modal */}
      {selectedPrintOrder && (
        <PrintableShippingLabelModal
          order={selectedPrintOrder}
          onClose={() => setSelectedPrintOrder(null)}
        />
      )}

    </div>
  );
}
