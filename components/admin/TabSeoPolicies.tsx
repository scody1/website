'use client';

import React, { useState } from 'react';
import { useAdmin } from './AdminApp';
import { Button, Card, Field, Input, Textarea } from './ui';
import type { PolicySettings, SeoSettings } from '@/lib/shared/types';

export default function TabSeoPolicies() {
  const { settings, saveSection } = useAdmin();
  const [seo, setSeo] = useState<SeoSettings>(settings.seo);
  const [pol, setPol] = useState<PolicySettings>(settings.policies);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await saveSection('seo', seo);
    if (ok) await saveSection('policies', pol);
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <Card title="Search engine & sharing" subtitle="Used for the page title, Google results and WhatsApp/Facebook link previews." actions={<Button type="submit" loading={saving}>Save all</Button>}>
        <div className="grid grid-cols-1 gap-4">
          <Field label={`Meta title * (${seo.metaTitle.length}/60 recommended)`}><Input required value={seo.metaTitle} onChange={(e) => setSeo({ ...seo, metaTitle: e.target.value })} /></Field>
          <Field label={`Meta description (${seo.metaDescription.length}/160 recommended)`}><Textarea rows={2} value={seo.metaDescription} onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })} /></Field>
          <Field label="Keywords (comma separated)"><Input value={seo.metaKeywords} onChange={(e) => setSeo({ ...seo, metaKeywords: e.target.value })} /></Field>
          <Field label="Share image URL" hint="1200×630 image used when the link is shared."><Input value={seo.ogImage} onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })} /></Field>
          <Field label="Google Analytics 4 measurement ID" hint="Looks like G-XXXXXXXXXX. Leave empty to disable analytics.">
            <Input value={seo.gaMeasurementId} onChange={(e) => setSeo({ ...seo, gaMeasurementId: e.target.value.toUpperCase() })} />
          </Field>
        </div>
      </Card>
      <Card title="Store policies" subtitle="Shown in the footer policy pop-ups. Have these reviewed for your business — they are legal documents.">
        <div className="grid grid-cols-1 gap-4">
          <Field label="Privacy policy"><Textarea rows={6} value={pol.privacyPolicy} onChange={(e) => setPol({ ...pol, privacyPolicy: e.target.value })} /></Field>
          <Field label="Terms & conditions"><Textarea rows={6} value={pol.termsConditions} onChange={(e) => setPol({ ...pol, termsConditions: e.target.value })} /></Field>
          <Field label="Refund & return policy"><Textarea rows={6} value={pol.refundPolicy} onChange={(e) => setPol({ ...pol, refundPolicy: e.target.value })} /></Field>
          <Field label="Shipping policy"><Textarea rows={6} value={pol.shippingPolicy} onChange={(e) => setPol({ ...pol, shippingPolicy: e.target.value })} /></Field>
        </div>
      </Card>
    </form>
  );
}
