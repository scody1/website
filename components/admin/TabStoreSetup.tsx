'use client';

import React, { useState } from 'react';
import { useAdmin } from './AdminApp';
import { Button, Card, Field, Input, Select, Textarea } from './ui';
import type { BusinessProfile, StoreProfile } from '@/lib/shared/types';

export default function TabStoreSetup() {
  const { settings, saveSection, can } = useAdmin();
  const [store, setStore] = useState<StoreProfile>(settings.store);
  const [biz, setBiz] = useState<BusinessProfile>(settings.business);
  const [saving, setSaving] = useState<'store' | 'business' | null>(null);

  const s = <K extends keyof StoreProfile>(k: K, v: StoreProfile[K]) => setStore((x) => ({ ...x, [k]: v }));
  const b = <K extends keyof BusinessProfile>(k: K, v: BusinessProfile[K]) => setBiz((x) => ({ ...x, [k]: v }));

  return (
    <div className="space-y-6">
      {can('settings.store') && <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving('store');
          await saveSection('store', store);
          setSaving(null);
        }}
      >
        <Card title="Store profile" subtitle="Shown in the header, hero banner, footer and WhatsApp buttons." actions={<Button type="submit" loading={saving === 'store'}>Save profile</Button>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Store name *"><Input required value={store.storeName} onChange={(e) => s('storeName', e.target.value)} /></Field>
            <Field label="Tagline"><Input value={store.tagline} onChange={(e) => s('tagline', e.target.value)} /></Field>
            <Field label="WhatsApp number" hint="10-digit number; customers message this number."><Input value={store.whatsapp} onChange={(e) => s('whatsapp', e.target.value)} /></Field>
            <Field label="Support phone"><Input value={store.supportPhone} onChange={(e) => s('supportPhone', e.target.value)} /></Field>
            <Field label="Support email"><Input type="email" value={store.supportEmail} onChange={(e) => s('supportEmail', e.target.value)} /></Field>
            <Field label="Instagram URL"><Input value={store.instagramUrl} onChange={(e) => s('instagramUrl', e.target.value)} placeholder="https://instagram.com/…" /></Field>
            <Field label="Announcement bar" className="sm:col-span-2"><Input value={store.announcement} onChange={(e) => s('announcement', e.target.value)} /></Field>
            <Field label="Hero headline"><Input value={store.heroHeadline} onChange={(e) => s('heroHeadline', e.target.value)} /></Field>
            <Field label="Hero sub-headline"><Input value={store.heroSubheadline} onChange={(e) => s('heroSubheadline', e.target.value)} /></Field>
            <Field label="WhatsApp greeting message" className="sm:col-span-2"><Textarea rows={2} value={store.whatsappGreeting} onChange={(e) => s('whatsappGreeting', e.target.value)} /></Field>
          </div>
        </Card>
      </form>}

      {can('settings.pickup') && <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving('business');
          await saveSection('business', biz);
          setSaving(null);
        }}
      >
        <Card
          title="Pickup address & billing"
          subtitle="Used on invoices and for Shiprocket pickups. The pickup address itself must also be added and verified inside your Shiprocket panel."
          actions={<Button type="submit" loading={saving === 'business'}>Save address</Button>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Legal business name"><Input value={biz.businessLegalName} onChange={(e) => b('businessLegalName', e.target.value)} /></Field>
            <Field label="Contact person"><Input value={biz.contactName} onChange={(e) => b('contactName', e.target.value)} /></Field>
            <Field label="Contact phone"><Input value={biz.phone} onChange={(e) => b('phone', e.target.value)} /></Field>
            <Field label="Shop / building / house no."><Input value={biz.shopHouseNo} onChange={(e) => b('shopHouseNo', e.target.value)} /></Field>
            <Field label="Street / area"><Input value={biz.street} onChange={(e) => b('street', e.target.value)} /></Field>
            <Field label="Landmark"><Input value={biz.landmark} onChange={(e) => b('landmark', e.target.value)} /></Field>
            <Field label="City"><Input value={biz.city} onChange={(e) => b('city', e.target.value)} /></Field>
            <Field label="State" hint="Used to decide CGST+SGST vs IGST on invoices."><Input value={biz.state} onChange={(e) => b('state', e.target.value)} /></Field>
            <Field label="Pincode"><Input inputMode="numeric" maxLength={6} value={biz.pincode} onChange={(e) => b('pincode', e.target.value.replace(/\D/g, ''))} /></Field>
            <Field label="Shiprocket pickup location name" hint="Must exactly match the pickup nickname in Shiprocket → Settings → Pickup Addresses. Use “Test connection” in the Shiprocket tab to pick it.">
              <Input value={biz.shiprocketPickupNickname} onChange={(e) => b('shiprocketPickupNickname', e.target.value)} />
            </Field>
            <Field label="Billing type">
              <Select value={biz.billingType} onChange={(e) => b('billingType', e.target.value as BusinessProfile['billingType'])}>
                <option value="NONGST">Not GST registered (Bill of Supply)</option>
                <option value="GST">GST registered (Tax Invoice)</option>
              </Select>
            </Field>
            <Field label="GSTIN"><Input value={biz.gstin} disabled={biz.billingType !== 'GST'} onChange={(e) => b('gstin', e.target.value.toUpperCase())} /></Field>
            <Field label="PAN (private, not shown publicly)"><Input value={biz.pan} onChange={(e) => b('pan', e.target.value.toUpperCase())} /></Field>
          </div>
        </Card>
      </form>}
    </div>
  );
}
