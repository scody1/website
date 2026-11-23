'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { playTempleBellChime } from '@/lib/audioChime';
import Link from 'next/link';
import {
  ArrowLeft, BarChart3, Bell, BellOff, Building2, CheckSquare, CreditCard, Globe, KeyRound, LogOut, MessageSquare, Package, Plug,
  ShieldCheck, ShoppingCart, Truck, Users
} from 'lucide-react';
import { adminFetch, errorMessage } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { AllSettings, SettingsSection } from '@/lib/shared/types';
import { type AdminUser, type Permission } from '@/lib/shared/roles';
import { Button, ErrorBox, Field, Input, Modal, Spinner } from './ui';
import TabDashboard from './TabDashboard';
import TabStoreSetup from './TabStoreSetup';
import TabProducts from './TabProducts';
import TabOrders, { openOrdersWith } from './TabOrders';
import TabCustomers from './TabCustomers';
import TabShipping from './TabShipping';
import TabAnalytics from './TabAnalytics';
import TabPayments from './TabPayments';
import TabSeoPolicies from './TabSeoPolicies';
import TabReviews from './TabReviews';
import TabIntegrations from './TabIntegrations';
import TabUsers from './TabUsers';

export interface AdminStatus {
  integrations: {
    database: boolean;
    shiprocket: boolean;
    shiprocketWebhook: boolean;
    razorpay: boolean;
    razorpayWebhook: boolean;
    delhivery: boolean;
    email: boolean;
    cron: boolean;
    siteUrl: string | null;
  };
  counts: { products: number; newOrders: number; awaitingVerification: number; pendingReviews: number; lowStock: number; placedTotal: number; refundsDue: number; openReturns: number };
  latestOrder: string | null;
}

interface AdminCtx {
  user: AdminUser;
  can: (p: Permission) => boolean;
  settings: AllSettings;
  status: AdminStatus | null;
  saveSection: <K extends SettingsSection>(section: K, value: AllSettings[K]) => Promise<boolean>;
  refreshStatus: () => void;
  goTo: (tab: TabId) => void;
}

const Ctx = createContext<AdminCtx | null>(null);
export function useAdmin() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAdmin outside AdminApp');
  return c;
}

type Need = Permission | Permission[] | null; // array = any of
const TABS: { id: string; label: string; icon: React.ElementType; need: Need }[] = [
  { id: 'dashboard', label: 'Overview', icon: CheckSquare, need: null },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, need: 'orders.view' },
  { id: 'products', label: 'Products & Stock', icon: Package, need: 'products.view' },
  { id: 'shipping', label: 'Shipping Setup', icon: Truck, need: 'shipping.setup' },
  { id: 'customers', label: 'Customers', icon: Users, need: 'customers.view' },
  { id: 'analytics', label: 'Sales & Profit', icon: BarChart3, need: 'reports.sales' },
  { id: 'payments', label: 'Payments & Coupons', icon: CreditCard, need: ['settings.payments', 'coupons.view'] },
  { id: 'store', label: 'Store & Pickup', icon: Building2, need: ['settings.store', 'settings.pickup'] },
  { id: 'seo', label: 'SEO & Policies', icon: Globe, need: 'settings.seo' },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare, need: 'reviews.view' },
  { id: 'integrations', label: 'Integrations', icon: Plug, need: 'integrations.manage' },
  { id: 'users', label: 'Users & Roles', icon: ShieldCheck, need: ['users.view', 'users.manage', 'roles.manage'] }
];
export type TabId = string;

export default function AdminApp() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabId>('dashboard');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [settings, setSettings] = useState<AllSettings | null>(null);
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [me, { settings }, st] = await Promise.all([
        adminFetch<{ user: AdminUser; permissions: Permission[] }>('/api/admin/me'),
        adminFetch<{ settings: AllSettings }>('/api/admin/settings'),
        adminFetch<AdminStatus>('/api/admin/status')
      ]);
      setUser(me.user);
      setPerms(me.permissions);
      setSettings(settings);
      setStatus(st);
      lastPlaced.current = st.counts.placedTotal;
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  // ---- new-order alerts (sound + browser notification + toast)
  const [alertsOn, setAlertsOn] = useState(false);
  const lastPlaced = useRef<number | null>(null);
  useEffect(() => {
    try {
      setAlertsOn(localStorage.getItem('rps_order_alerts') === 'on');
    } catch {
      /* ignore */
    }
  }, []);
  const toggleAlerts = async () => {
    const next = !alertsOn;
    if (next) {
      playTempleBellChime(); // a click unlocks audio in the browser and lets you hear the alert sound
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        await Notification.requestPermission().catch(() => undefined);
      }
    }
    setAlertsOn(next);
    try {
      localStorage.setItem('rps_order_alerts', next ? 'on' : 'off');
    } catch {
      /* ignore */
    }
    showToast(next ? 'Order alerts on' : 'Order alerts off', next ? 'You will hear a bell and see a pop-up when a new order arrives (keep this tab open).' : 'Sound and pop-ups are off.', 'info');
  };
  const alertsRef = useRef(alertsOn);
  alertsRef.current = alertsOn;

  const refreshStatus = useCallback(() => {
    adminFetch<AdminStatus>('/api/admin/status')
      .then((st) => {
        const placed = st.counts.placedTotal;
        if (lastPlaced.current !== null && placed > lastPlaced.current) {
          const n = placed - lastPlaced.current;
          showToast('🛒 New order!', `${n} new order${n === 1 ? '' : 's'} — latest ${st.latestOrder ?? ''}`, 'success');
          if (alertsRef.current) {
            playTempleBellChime();
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                new Notification('New order received', { body: `${st.latestOrder ?? 'A new order'} — open the admin panel to process it.`, tag: 'rps-new-order' });
              } catch {
                /* some browsers only allow notifications from a service worker */
              }
            }
          }
        }
        lastPlaced.current = placed;
        setStatus(st);
      })
      .catch(() => undefined);
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setInterval(refreshStatus, 20_000);
    return () => clearInterval(t);
  }, [refreshStatus]);

  const can = useCallback((p: Permission) => perms.includes(p), [perms]);
  const allowed = (need: Need) => need === null || (Array.isArray(need) ? need.some(can) : can(need));

  const saveSection = useCallback(async <K extends SettingsSection>(section: K, value: AllSettings[K]) => {
    try {
      const res = await adminFetch<{ value: AllSettings[K] }>('/api/admin/settings', { method: 'PUT', json: { section, value } });
      setSettings((s) => (s ? { ...s, [section]: res.value } : s));
      showToast('Saved', 'Settings updated and live on the store.');
      return true;
    } catch (err) {
      showToast('Could not save', errorMessage(err), 'error');
      return false;
    }
  }, [showToast]);

  const logout = async () => {
    try {
      await adminFetch('/api/admin/logout', { method: 'POST' });
    } finally {
      window.location.reload();
    }
  };

  if (loadError) return <div className="p-6 max-w-xl mx-auto"><ErrorBox message={loadError} onRetry={load} /></div>;
  if (!settings || !user) return <Spinner label="Loading admin…" />;

  const visibleTabs = TABS.filter((t) => allowed(t.need));
  const active = visibleTabs.some((t) => t.id === tab) ? tab : 'dashboard';
  const c = status?.counts;
  const badges: Record<string, number> = {
    orders: (c?.newOrders || 0) + (can('payments.verify') ? c?.awaitingVerification || 0 : 0)
      + (can('payments.refund') ? c?.refundsDue || 0 : 0) + (can('orders.status') ? c?.openReturns || 0 : 0),
    products: c?.lowStock || 0,
    reviews: c?.pendingReviews || 0
  };

  return (
    <Ctx.Provider value={{ user, can, settings, status, saveSection, refreshStatus, goTo: setTab }}>
      <div className="min-h-screen bg-stone-100 text-espresso pb-16">
        <header className="bg-stone-900 text-parchment-100 border-b border-gold-500/40 px-3 sm:px-6 py-3 sticky top-0 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-serif font-bold text-gold-300 text-sm">{settings.store.storeName} — Admin</span>
              {c && c.newOrders > 0 && can('orders.view') && (
                <button onClick={() => setTab('orders')} className="bg-red-600 text-white font-bold px-2 py-0.5 rounded-full text-[11px]">
                  {c.newOrders} new order{c.newOrders === 1 ? '' : 's'}
                </button>
              )}
              {c && c.awaitingVerification > 0 && can('payments.verify') && (
                <button onClick={() => setTab('orders')} className="bg-purple-600 text-white font-bold px-2 py-0.5 rounded-full text-[11px]">
                  {c.awaitingVerification} UPI to verify
                </button>
              )}
              {c && c.refundsDue > 0 && can('payments.refund') && (
                <button onClick={() => { openOrdersWith('refunds'); setTab('orders'); }} className="bg-amber-600 text-white font-bold px-2 py-0.5 rounded-full text-[11px]">
                  {c.refundsDue} refund{c.refundsDue === 1 ? '' : 's'} due
                </button>
              )}
              {c && c.openReturns > 0 && can('orders.status') && (
                <button onClick={() => { openOrdersWith('returns'); setTab('orders'); }} className="bg-sky-700 text-white font-bold px-2 py-0.5 rounded-full text-[11px]">
                  {c.openReturns} return request{c.openReturns === 1 ? '' : 's'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-stone-300">{user.name} · <span className="text-gold-300 font-bold">{user.roleName}</span></span>
              {can('orders.view') && (
                <button onClick={toggleAlerts} title="New-order sound and pop-up" className={`border font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${alertsOn ? 'bg-emerald-700 border-emerald-500 text-white' : 'bg-stone-800 border-stone-700 text-stone-200 hover:bg-stone-700'}`}>
                  {alertsOn ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />} {alertsOn ? 'Alerts on' : 'Order alerts'}
                </button>
              )}
              <button onClick={() => setShowPassword(true)} className="bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Password
              </button>
              <Link href="/" target="_blank" className="bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> View store
              </Link>
              <button onClick={logout} className="bg-stone-800 hover:bg-rose-900 border border-stone-700 text-stone-200 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-5">
          <nav className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const on = active === t.id;
              const badge = badges[t.id];
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition shadow-sm ${
                    on ? 'bg-maroon-700 text-parchment-100 ring-2 ring-gold-400' : 'bg-white text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${on ? 'text-gold-300' : 'text-stone-500'}`} />
                  {t.label}
                  {badge ? <span className="bg-red-600 text-white text-[10px] px-1.5 rounded-full">{badge}</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-2">
            {active === 'dashboard' && <TabDashboard />}
            {active === 'orders' && <TabOrders onChanged={refreshStatus} />}
            {active === 'products' && <TabProducts />}
            {active === 'shipping' && <TabShipping />}
            {active === 'customers' && <TabCustomers />}
            {active === 'analytics' && <TabAnalytics />}
            {active === 'payments' && <TabPayments />}
            {active === 'store' && <TabStoreSetup />}
            {active === 'seo' && <TabSeoPolicies />}
            {active === 'reviews' && <TabReviews onChanged={refreshStatus} />}
            {active === 'integrations' && <TabIntegrations onChanged={refreshStatus} />}
            {active === 'users' && <TabUsers />}
          </div>
        </div>
      </div>

      {(showPassword || user.mustChangePassword) && (
        <ChangePasswordModal forced={user.mustChangePassword} onClose={() => setShowPassword(false)} onDone={() => { setShowPassword(false); load(); }} />
      )}
    </Ctx.Provider>
  );
}

function ChangePasswordModal({ forced, onClose, onDone }: { forced: boolean; onClose: () => void; onDone: () => void }) {
  const { showToast } = useToast();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.next !== f.confirm) return setError('The new passwords do not match.');
    setBusy(true);
    setError(null);
    try {
      await adminFetch('/api/admin/me', { method: 'PUT', json: { currentPassword: f.current, newPassword: f.next } });
      showToast('Password changed', 'Your other devices have been signed out.');
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={forced ? 'Set your own password' : 'Change password'} onClose={forced ? () => undefined : onClose}>
      <form onSubmit={submit} className="space-y-3">
        {forced && <p className="text-xs text-stone-600">You signed in with a temporary password. Please choose your own before continuing.</p>}
        <Field label="Current password"><Input type="password" autoComplete="current-password" required value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Field>
        <Field label="New password" hint="At least 10 characters, with letters and numbers."><Input type="password" autoComplete="new-password" required value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></Field>
        <Field label="Repeat new password"><Input type="password" autoComplete="new-password" required value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></Field>
        {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
        <div className="flex justify-end gap-2">
          {!forced && <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>}
          <Button type="submit" loading={busy}>Save password</Button>
        </div>
      </form>
    </Modal>
  );
}
