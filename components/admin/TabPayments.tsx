'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAdmin } from './AdminApp';
import { Badge, Button, Card, ErrorBox, Field, Input, Select, Spinner, Toggle } from './ui';
import { adminFetch, errorMessage } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { formatDate } from '@/lib/shared/format';
import type { Coupon, PaymentSettings } from '@/lib/shared/types';

const emptyCoupon = { code: '', description: '', discountType: 'PERCENT' as 'PERCENT' | 'FLAT', discountValue: 10, maxDiscount: '', minOrderValue: 0, usageLimit: '', startsAt: '', expiresAt: '' };

export default function TabPayments() {
  const { settings, saveSection, status, can, goTo } = useAdmin();
  const canSettings = can('settings.payments');
  const canCoupons = can('coupons.view');
  const manageCoupons = can('coupons.manage');
  const { showToast } = useToast();
  const [cfg, setCfg] = useState<PaymentSettings>(settings.payments);
  const [saving, setSaving] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nc, setNc] = useState(emptyCoupon);
  const [creating, setCreating] = useState(false);

  const loadCoupons = useCallback(async () => {
    setError(null);
    try {
      const { coupons } = await adminFetch<{ coupons: Coupon[] }>('/api/admin/coupons');
      setCoupons(coupons);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    if (canCoupons) loadCoupons();
  }, [loadCoupons, canCoupons]);

  const num = (v: string) => (v === '' ? 0 : Math.max(0, Math.floor(Number(v))));
  const razorpayReady = status?.integrations.razorpay;

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminFetch('/api/admin/coupons', {
        method: 'POST',
        json: { ...nc, maxDiscount: nc.maxDiscount || null, usageLimit: nc.usageLimit || null, startsAt: nc.startsAt || null, expiresAt: nc.expiresAt || null, isActive: true }
      });
      showToast('Coupon created', nc.code.toUpperCase());
      setNc(emptyCoupon);
      loadCoupons();
    } catch (err) {
      showToast('Could not create coupon', errorMessage(err), 'error');
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (c: Coupon) => {
    try {
      await adminFetch(`/api/admin/coupons/${c.id}`, { method: 'PATCH', json: { isActive: !c.isActive } });
      loadCoupons();
    } catch (err) {
      showToast('Update failed', errorMessage(err), 'error');
    }
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`Delete coupon ${c.code}? Past orders keep their discount.`)) return;
    try {
      await adminFetch(`/api/admin/coupons/${c.id}`, { method: 'DELETE' });
      loadCoupons();
    } catch (err) {
      showToast('Delete failed', errorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-6">
      {canSettings && <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          await saveSection('payments', cfg);
          setSaving(false);
        }}
      >
        <Card title="Shipping charges & payment methods" actions={<Button type="submit" loading={saving}>Save</Button>}>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Field label="Shipping fee (₹)"><Input type="number" min={0} value={cfg.standardShippingFee} onChange={(e) => setCfg({ ...cfg, standardShippingFee: num(e.target.value) })} /></Field>
            <Field label="Free shipping above (₹)" hint="0 = never free"><Input type="number" min={0} value={cfg.freeShippingThreshold} onChange={(e) => setCfg({ ...cfg, freeShippingThreshold: num(e.target.value) })} /></Field>
            <Field label="COD fee (₹)"><Input type="number" min={0} value={cfg.codFee} onChange={(e) => setCfg({ ...cfg, codFee: num(e.target.value) })} /></Field>
            <Field label="Max COD order (₹)" hint="0 = no limit"><Input type="number" min={0} value={cfg.codMaxOrderValue} onChange={(e) => setCfg({ ...cfg, codMaxOrderValue: num(e.target.value) })} /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            <div className="p-4 rounded-2xl border border-stone-200 space-y-2">
              <Toggle checked={cfg.enableCod} onChange={(v) => setCfg({ ...cfg, enableCod: v })} label="Cash on Delivery" />
              <p className="text-[11px] text-stone-500">Marked paid automatically when the courier delivers.</p>
            </div>
            <div className="p-4 rounded-2xl border border-stone-200 space-y-2">
              <Toggle checked={cfg.enableRazorpay} onChange={(v) => setCfg({ ...cfg, enableRazorpay: v })} label="Razorpay (cards, UPI, netbanking)" />
              <p className="text-[11px] text-stone-500">
                {razorpayReady ? 'Razorpay is connected. Payments are verified automatically.' : 'Not connected yet — a Super Admin connects it in Integrations. Hidden from customers until then.'}
              </p>
              {razorpayReady ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Connected</Badge> : can('integrations.manage') ? <button type="button" onClick={() => goTo('integrations')} className="text-xs font-bold text-saffron-700 underline">Connect Razorpay →</button> : <Badge className="bg-amber-50 text-amber-800 border-amber-200">Not connected</Badge>}
            </div>
            <div className="p-4 rounded-2xl border border-stone-200 space-y-2">
              <Toggle checked={cfg.enableUpi} onChange={(v) => setCfg({ ...cfg, enableUpi: v })} label="Manual UPI QR" />
              <Input value={cfg.upiId} onChange={(e) => setCfg({ ...cfg, upiId: e.target.value.trim() })} placeholder="yourname@bank" />
              <Input value={cfg.merchantName} onChange={(e) => setCfg({ ...cfg, merchantName: e.target.value })} placeholder="Name shown in UPI app" />
              <p className="text-[11px] text-stone-500">You must check each UTR in your bank app and approve it in Orders before shipping.</p>
            </div>
          </div>
        </Card>
      </form>}

      {canCoupons && <Card title="Coupons" subtitle="Validated on the server at checkout: dates, minimum order and usage limits are enforced.">
        {manageCoupons && <form onSubmit={createCoupon} className="grid grid-cols-2 md:grid-cols-9 gap-3 items-end bg-parchment-50 p-4 rounded-2xl border border-gold-300/40">
          <Field label="Code"><Input required value={nc.code} onChange={(e) => setNc({ ...nc, code: e.target.value.toUpperCase() })} placeholder="DIWALI15" /></Field>
          <Field label="Type">
            <Select value={nc.discountType} onChange={(e) => setNc({ ...nc, discountType: e.target.value as 'PERCENT' | 'FLAT' })}>
              <option value="PERCENT">% off</option>
              <option value="FLAT">₹ off</option>
            </Select>
          </Field>
          <Field label="Value"><Input type="number" min={1} required value={nc.discountValue} onChange={(e) => setNc({ ...nc, discountValue: num(e.target.value) })} /></Field>
          <Field label="Max ₹ off"><Input type="number" min={0} value={nc.maxDiscount} onChange={(e) => setNc({ ...nc, maxDiscount: e.target.value })} placeholder="none" /></Field>
          <Field label="Min order ₹"><Input type="number" min={0} value={nc.minOrderValue} onChange={(e) => setNc({ ...nc, minOrderValue: num(e.target.value) })} /></Field>
          <Field label="Total uses"><Input type="number" min={0} value={nc.usageLimit} onChange={(e) => setNc({ ...nc, usageLimit: e.target.value })} placeholder="unlimited" /></Field>
          <Field label="Starts"><Input type="date" value={nc.startsAt} onChange={(e) => setNc({ ...nc, startsAt: e.target.value })} /></Field>
          <Field label="Expires"><Input type="date" value={nc.expiresAt} onChange={(e) => setNc({ ...nc, expiresAt: e.target.value })} /></Field>
          <Button type="submit" loading={creating}>Add</Button>
          <Field label="Description (shown to customer)" className="col-span-2 md:col-span-9">
            <Input value={nc.description} onChange={(e) => setNc({ ...nc, description: e.target.value })} />
          </Field>
        </form>}

        <div className="mt-4">
          {error ? <ErrorBox message={error} onRetry={loadCoupons} /> : !coupons ? <Spinner /> : coupons.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-6">No coupons yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-parchment-100 text-maroon-700 text-[10px] uppercase">
                  <tr><th className="p-2 text-left">Code</th><th className="p-2 text-left">Discount</th><th className="p-2 text-left">Min order</th><th className="p-2 text-left">Used</th><th className="p-2 text-left">Valid</th><th className="p-2 text-left">Status</th><th className="p-2" /></tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {coupons.map((c) => (
                    <tr key={c.id}>
                      <td className="p-2 font-mono font-bold">{c.code}<span className="block font-sans font-normal text-[10px] text-stone-400">{c.description}</span></td>
                      <td className="p-2">{c.discountType === 'PERCENT' ? `${c.discountValue}%` : `₹${c.discountValue}`}{c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ''}</td>
                      <td className="p-2">₹{c.minOrderValue}</td>
                      <td className="p-2">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                      <td className="p-2 text-[10px]">{c.startsAt ? formatDate(c.startsAt) : 'now'} → {c.expiresAt ? formatDate(c.expiresAt) : 'no expiry'}</td>
                      <td className="p-2">
                        <button onClick={() => manageCoupons && toggle(c)} disabled={!manageCoupons}>
                          <Badge className={c.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-100 text-stone-500 border-stone-200'}>{c.isActive ? 'Active' : 'Paused'}</Badge>
                        </button>
                      </td>
                      <td className="p-2 text-right">{manageCoupons && <button onClick={() => remove(c)} className="text-rose-600 p-1" aria-label="Delete coupon"><Trash2 className="w-4 h-4" /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>}
    </div>
  );
}
