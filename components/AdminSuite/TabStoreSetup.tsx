'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { StoreConfig, PickupAddress } from '@/lib/types';
import { Save, Building2, MapPin, Phone, Shield } from 'lucide-react';

export default function TabStoreSetup() {
  const { state, updateStoreConfig, updatePickupAddress } = useStore();

  const [storeCfg, setStoreCfg] = useState<StoreConfig>({ ...state.storeConfig });
  const [pickupAddr, setPickupAddr] = useState<PickupAddress>({ ...state.pickupAddress });

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreConfig(storeCfg);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    updatePickupAddress(pickupAddr);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* 1. Brand Profile & Customer Contact Vault */}
      <form onSubmit={handleSaveStore} className="bg-white p-6 rounded-3xl border border-gold-500/40 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-stone-200">
          <Building2 className="w-5 h-5 text-maroon-700" />
          <h3 className="font-serif text-base font-bold text-maroon-700">
            Brand Profile & Customer Contact Vault
          </h3>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Store Display Name *</label>
            <input
              type="text"
              required
              value={storeCfg.storeName}
              onChange={(e) => setStoreCfg({ ...storeCfg, storeName: e.target.value })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Tagline</label>
            <input
              type="text"
              value={storeCfg.tagline}
              onChange={(e) => setStoreCfg({ ...storeCfg, tagline: e.target.value })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Top Announcement Bar Text *</label>
            <input
              type="text"
              required
              value={storeCfg.announcement}
              onChange={(e) => setStoreCfg({ ...storeCfg, announcement: e.target.value })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Official WhatsApp Number</label>
              <input
                type="text"
                value={storeCfg.whatsapp}
                onChange={(e) => setStoreCfg({ ...storeCfg, whatsapp: e.target.value.replace(/\D/g, '') })}
                placeholder="919876543210"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Customer Support Phone</label>
              <input
                type="text"
                value={storeCfg.supportPhone}
                onChange={(e) => setStoreCfg({ ...storeCfg, supportPhone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Official Support Email</label>
              <input
                type="email"
                value={storeCfg.supportEmail}
                onChange={(e) => setStoreCfg({ ...storeCfg, supportEmail: e.target.value })}
                placeholder="contact@rajeshwarpooja.com"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Instagram Profile URL</label>
              <input
                type="url"
                value={storeCfg.instagramUrl}
                onChange={(e) => setStoreCfg({ ...storeCfg, instagramUrl: e.target.value })}
                placeholder="https://instagram.com/rajeshwarpooja"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Pre-filled WhatsApp Inquiry Message</label>
            <input
              type="text"
              value={storeCfg.whatsappGreeting}
              onChange={(e) => setStoreCfg({ ...storeCfg, whatsappGreeting: e.target.value })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-stone-100">
            <label className="block font-semibold text-stone-700 mb-1">Admin Passcode (Security PIN) *</label>
            <input
              type="text"
              required
              value={storeCfg.adminPasscode}
              onChange={(e) => setStoreCfg({ ...storeCfg, adminPasscode: e.target.value })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono font-bold text-espresso focus:border-maroon-700 focus:outline-none"
            />
            <p className="text-[10px] text-stone-400 mt-0.5">Used to lock/unlock this Admin Management Suite.</p>
          </div>
        </div>

        <div className="pt-3">
          <button
            type="submit"
            className="w-full bg-maroon-700 hover:bg-maroon-800 text-parchment-100 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
          >
            <Save className="w-4 h-4 text-gold-300" />
            <span>Save General Store Config</span>
          </button>
        </div>
      </form>

      {/* 2. Registered Courier Pickup & Invoicing Address */}
      <form onSubmit={handleSaveAddress} className="bg-white p-6 rounded-3xl border border-gold-500/40 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-stone-200">
          <MapPin className="w-5 h-5 text-saffron-600" />
          <h3 className="font-serif text-base font-bold text-maroon-700">
            Courier Pickup & Billing Address Vault
          </h3>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Business Legal Name *</label>
            <input
              type="text"
              required
              value={pickupAddr.businessLegalName}
              onChange={(e) => setPickupAddr({ ...pickupAddr, businessLegalName: e.target.value })}
              className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
            />
          </div>

          {/* GST Billing Mode */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Invoice & Tax Mode *</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer hover:bg-parchment-50">
                <input
                  type="radio"
                  name="billingType"
                  value="NONGST"
                  checked={pickupAddr.billingType === 'NONGST'}
                  onChange={() => setPickupAddr({ ...pickupAddr, billingType: 'NONGST' })}
                />
                <span className="font-bold">Non-GST (Bill of Supply)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer hover:bg-parchment-50">
                <input
                  type="radio"
                  name="billingType"
                  value="GST"
                  checked={pickupAddr.billingType === 'GST'}
                  onChange={() => setPickupAddr({ ...pickupAddr, billingType: 'GST' })}
                />
                <span className="font-bold">GST Registered</span>
              </label>
            </div>
          </div>

          {pickupAddr.billingType === 'GST' && (
            <div className="grid grid-cols-2 gap-3 animate-fadeIn">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">GSTIN *</label>
                <input
                  type="text"
                  value={pickupAddr.gstin}
                  onChange={(e) => setPickupAddr({ ...pickupAddr, gstin: e.target.value.toUpperCase() })}
                  placeholder="22AAAAA0000A1Z5"
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 uppercase font-mono text-espresso focus:border-maroon-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={pickupAddr.pan}
                  onChange={(e) => setPickupAddr({ ...pickupAddr, pan: e.target.value.toUpperCase() })}
                  placeholder="AAAAA0000A"
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 uppercase font-mono text-espresso focus:border-maroon-700 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Pickup Contact Name *</label>
              <input
                type="text"
                required
                value={pickupAddr.contactName}
                onChange={(e) => setPickupAddr({ ...pickupAddr, contactName: e.target.value })}
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Shiprocket Pickup Nickname *</label>
              <input
                type="text"
                required
                value={pickupAddr.shiprocketPickupNickname}
                onChange={(e) => setPickupAddr({ ...pickupAddr, shiprocketPickupNickname: e.target.value })}
                placeholder="Primary_Warehouse"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Shop / House No.</label>
              <input
                type="text"
                value={pickupAddr.shopHouseNo}
                onChange={(e) => setPickupAddr({ ...pickupAddr, shopHouseNo: e.target.value })}
                placeholder="Plot 104"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">Street / Area *</label>
              <input
                type="text"
                required
                value={pickupAddr.street}
                onChange={(e) => setPickupAddr({ ...pickupAddr, street: e.target.value })}
                placeholder="Temple Road, Brass Market"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">City *</label>
              <input
                type="text"
                required
                value={pickupAddr.city}
                onChange={(e) => setPickupAddr({ ...pickupAddr, city: e.target.value })}
                placeholder="Varanasi"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">State *</label>
              <input
                type="text"
                required
                value={pickupAddr.state}
                onChange={(e) => setPickupAddr({ ...pickupAddr, state: e.target.value })}
                placeholder="Uttar Pradesh"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">6-Digit Pincode *</label>
              <input
                type="text"
                required
                maxLength={6}
                value={pickupAddr.pincode}
                onChange={(e) => setPickupAddr({ ...pickupAddr, pincode: e.target.value.replace(/\D/g, '') })}
                placeholder="221001"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 font-bold text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-3">
          <button
            type="submit"
            className="w-full bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Pickup & Dispatch Address</span>
          </button>
        </div>
      </form>

    </div>
  );
}
