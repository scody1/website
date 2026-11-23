'use client';

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { useAdmin, TabId } from './AdminApp';
import { openOrdersWith } from './TabOrders';
import { Card } from './ui';

export default function TabDashboard() {
  const { settings, status, goTo, can } = useAdmin();
  const i = status?.integrations;
  const b = settings.business;
  const p = settings.payments;

  const steps: { title: string; detail: string; done: boolean; tab?: TabId; env?: boolean }[] = [
    { title: 'Store contact details', detail: 'WhatsApp / support phone and email shown to customers.', done: Boolean(settings.store.whatsapp || settings.store.supportPhone), tab: 'store' },
    { title: 'Pickup address & billing', detail: 'Warehouse address, pincode, GST details.', done: Boolean(b.street && b.city && b.state && b.pincode), tab: 'store' },
    { title: 'Products with photos & stock', detail: `${status?.counts.products ?? 0} active products.`, done: (status?.counts.products ?? 0) > 0, tab: 'products' },
    { title: 'At least one payment method', detail: 'COD, Razorpay or manual UPI.', done: p.enableCod || (p.enableUpi && Boolean(p.upiId)) || (p.enableRazorpay && Boolean(i?.razorpay)), tab: 'payments' },
    { title: 'Shiprocket connected', detail: 'Super Admin → Integrations, then choose the pickup location in Shipping Setup.', done: Boolean(i?.shiprocket && b.shiprocketPickupNickname), tab: i?.shiprocket ? 'shipping' : 'integrations' },
    { title: 'Shiprocket tracking webhook', detail: 'Copy the URL and token from Integrations into Shiprocket → Settings → API → Webhooks.', done: Boolean(i?.shiprocketWebhook), tab: 'integrations' },
    { title: 'Razorpay (optional)', detail: 'Super Admin → Integrations: key ID, key secret and webhook secret.', done: Boolean(i?.razorpay && i?.razorpayWebhook), tab: 'integrations' },
    { title: 'Order e-mails (recommended)', detail: 'Integrations → Order e-mails: confirmation, tracking link and new-order alerts.', done: Boolean(i?.email), tab: 'integrations' },
    { title: 'Scheduled jobs', detail: 'CRON_SECRET set so unpaid orders expire and tracking syncs.', done: Boolean(i?.cron), env: true },
    { title: 'SEO & policies', detail: 'Title, description, privacy / terms / refund.', done: Boolean(settings.seo.metaTitle && settings.policies.privacyPolicy && settings.policies.refundPolicy), tab: 'seo' }
  ];
  const tabNeeds: Record<string, Parameters<typeof can>[0] | null> = {
    store: 'settings.pickup', products: 'products.view', payments: 'settings.payments', shipping: 'shipping.setup',
    integrations: 'integrations.manage', seo: 'settings.seo', orders: 'orders.view', reviews: 'reviews.view'
  };
  const canOpen = (t?: TabId) => Boolean(t) && (tabNeeds[t as string] ? can(tabNeeds[t as string]!) : true);
  const done = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'New orders', value: status?.counts.newOrders ?? '—', tab: 'orders' as TabId },
          { label: 'UPI payments to verify', value: status?.counts.awaitingVerification ?? '—', tab: 'orders' as TabId },
          { label: 'Low-stock products (≤5)', value: status?.counts.lowStock ?? '—', tab: 'products' as TabId },
          { label: 'Reviews awaiting approval', value: status?.counts.pendingReviews ?? '—', tab: 'reviews' as TabId },
          ...((status?.counts.refundsDue || 0) > 0 && can('payments.refund') ? [{ label: 'Refunds due (cancelled & paid)', value: status!.counts.refundsDue, tab: 'orders' as TabId, attention: 'refunds' as const }] : []),
          ...((status?.counts.openReturns || 0) > 0 && can('orders.status') ? [{ label: 'Open return requests', value: status!.counts.openReturns, tab: 'orders' as TabId, attention: 'returns' as const }] : [])
        ].filter((k) => canOpen(k.tab)).map((k) => (
          <button key={k.label} onClick={() => { if ('attention' in k && k.attention) openOrdersWith(k.attention); goTo(k.tab); }} className="bg-white p-4 rounded-2xl border border-gold-500/40 text-left hover:shadow-md transition">
            <p className="text-[11px] text-stone-500 font-semibold">{k.label}</p>
            <p className="text-2xl font-serif font-extrabold text-maroon-700 mt-1">{k.value}</p>
          </button>
        ))}
      </div>

      <Card title={`Go-live checklist (${done}/${steps.length})`} subtitle="Items marked “server” are environment variables set in your hosting dashboard (e.g. Vercel → Settings → Environment Variables).">
        <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
        <ul className="divide-y divide-stone-100">
          {steps.map((s) => (
            <li key={s.title} className="py-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {s.done ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" /> : <Circle className="w-5 h-5 text-stone-300 mt-0.5" />}
                <div>
                  <p className="text-sm font-bold text-espresso">
                    {s.title} {s.env && <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-1.5 rounded">server</span>}
                  </p>
                  <p className="text-xs text-stone-500">{s.detail}</p>
                </div>
              </div>
              {s.tab && canOpen(s.tab) && (
                <button onClick={() => goTo(s.tab!)} className="text-xs font-bold text-saffron-700 hover:underline whitespace-nowrap">
                  {s.done ? 'Edit' : 'Set up'} →
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
