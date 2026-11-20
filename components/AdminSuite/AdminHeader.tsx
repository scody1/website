'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/storeContext';
import { HardDrive, CheckSquare, Bell, ArrowLeft, Download, Upload, LogOut } from 'lucide-react';

interface AdminHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function AdminHeader({ activeTab, setActiveTab }: AdminHeaderProps) {
  const {
    state,
    setAdminUnlocked,
    showToast,
    storageUsage,
    exportJsonBackup,
    importJsonBackup
  } = useStore();

  const handleLockAdmin = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout API notice:', err);
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_token');
    }
    setAdminUnlocked(false);
    showToast('Admin Session Locked', 'You have been safely signed out.', 'info');
  };

  // Calculate 7-step checklist progress
  const checklistSteps = [
    { title: 'Store WhatsApp & Contact', done: Boolean(state.storeConfig.whatsapp) },
    { title: 'Courier Pickup Address', done: Boolean(state.pickupAddress.street && state.pickupAddress.pincode) },
    { title: 'Shiprocket / Delhivery API', done: Boolean(state.courierConfig.srEmail || state.courierConfig.srToken || state.courierConfig.dlToken) },
    { title: 'Catalog Products & Stock', done: state.products.length > 0 },
    { title: 'Payment Modes & UPI ID', done: Boolean(state.paymentShipping.upiId || state.paymentShipping.enableCod) },
    { title: 'Delivery Fees & Thresholds', done: state.paymentShipping.freeShippingThreshold > 0 },
    { title: 'Store Policies & SEO', done: Boolean(state.policiesSeo.privacyPolicy && state.policiesSeo.metaTitle) }
  ];

  const completedSteps = checklistSteps.filter((s) => s.done).length;
  const newOrdersCount = state.orders.filter((o) => o.orderStatus === 'New Order').length;

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importJsonBackup(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-stone-900 text-parchment-100 border-b border-gold-500/40 px-3 sm:px-6 py-2.5 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left: Engine status & Metrics */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-amber-200">100% Dynamic Engine</span>
          </div>

          {/* Setup Readiness 7-Step Pill */}
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition flex items-center gap-1.5 ${
              completedSteps === 7
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-stone-800 border-gold-500/50 text-gold-300 hover:bg-stone-700'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-gold-400" />
            <span>Setup: {completedSteps}/7 Ready</span>
          </button>

          {/* Storage Meter Pill */}
          <div
            className="hidden sm:inline-flex items-center gap-1.5 bg-stone-800 border border-stone-700 text-stone-300 px-2.5 py-1 rounded-full text-[11px]"
            title="LocalStorage Memory Consumption"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>{storageUsage.usedKb} KB / 5 MB</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications / Orders Bell */}
          <button
            onClick={() => setActiveTab('orders')}
            className="relative bg-stone-800 hover:bg-stone-700 border border-stone-700 text-gold-300 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1.5"
            title="New Orders"
          >
            <Bell className="w-3.5 h-3.5" />
            {newOrdersCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {newOrdersCount}
              </span>
            )}
          </button>

          {/* Backup & Restore Dropdown/Buttons */}
          <button
            onClick={exportJsonBackup}
            className="hidden md:inline-flex items-center gap-1 bg-stone-800 hover:bg-stone-700 border border-gold-500/40 text-parchment-200 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition"
            title="Download JSON Backup"
          >
            <Download className="w-3.5 h-3.5 text-gold-400" />
            <span>Backup</span>
          </button>

          <label
            className="hidden md:inline-flex items-center gap-1 bg-stone-800 hover:bg-stone-700 border border-gold-500/40 text-parchment-200 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer"
            title="Restore JSON Backup"
          >
            <Upload className="w-3.5 h-3.5 text-saffron-400" />
            <span>Restore</span>
            <input type="file" accept=".json" onChange={handleFileInput} className="hidden" />
          </label>

          {/* Return to Storefront */}
          <Link
            href="/"
            className="bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-md active:scale-95"
            title="Return to Customer Storefront"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>View Storefront</span>
          </Link>

          {/* Lock / Sign Out */}
          <button
            onClick={handleLockAdmin}
            className="bg-stone-800 hover:bg-rose-900/80 border border-stone-700 hover:border-rose-600 text-stone-300 hover:text-rose-200 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-md active:scale-95"
            title="Lock Admin Control Center"
          >
            <LogOut className="w-3.5 h-3.5 text-stone-400 group-hover:text-rose-300" />
            <span>Lock</span>
          </button>
        </div>

      </div>
    </div>
  );
}
