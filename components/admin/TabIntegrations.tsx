'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Copy, XCircle } from 'lucide-react';
import { adminFetch, errorMessage } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { formatDateTime } from '@/lib/shared/format';
import { Badge, Button, Card, ErrorBox, Field, Input, Spinner } from './ui';

interface Status {
  unreadable: string[];
  encryptionReady: boolean;
  encryptionProblem: string | null;
  shiprocket: { connected: boolean; source: 'env' | 'database' | null; email: string | null; savedAt: string | null; savedBy: string | null; webhookTokenSet: boolean };
  razorpay: { connected: boolean; source: 'env' | 'database' | null; keyId: string | null; mode: 'live' | 'test' | null; webhookSecretSet: boolean; savedAt: string | null; savedBy: string | null };
  delhivery: { connected: boolean; source: 'env' | 'database' | null; environment: 'production' | 'staging' | null; savedAt: string | null; savedBy: string | null };
  email: { connected: boolean; source: 'env' | 'database' | null; fromEmail: string | null; adminEmail: string | null; savedAt: string | null; savedBy: string | null };
  shiprocketWebhook: { url: string; token: string | null };
  razorpayWebhook: { url: string; events: string[] };
}

/** Super Admin only: connect Shiprocket and Razorpay once. Secrets are stored encrypted and never shown again. */
export default function TabIntegrations({ onChanged }: { onChanged: () => void }) {
  const { showToast } = useToast();
  const [s, setS] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sr, setSr] = useState({ email: '', password: '' });
  const [rz, setRz] = useState({ keyId: '', keySecret: '', webhookSecret: '' });
  const [dl, setDl] = useState({ token: '', environment: 'production' as 'production' | 'staging' });
  const [em, setEm] = useState({ apiKey: '', fromEmail: '', adminEmail: '' });
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setS(await adminFetch<Status>('/api/admin/integrations'));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  type Provider = 'shiprocket' | 'razorpay' | 'delhivery' | 'email';
  const NAMES: Record<Provider, string> = { shiprocket: 'Shiprocket', razorpay: 'Razorpay', delhivery: 'Delhivery', email: 'E-mail' };
  const save = async (provider: Provider) => {
    setBusy(provider);
    try {
      const body = provider === 'shiprocket' ? sr : provider === 'razorpay' ? rz : provider === 'delhivery' ? dl : em;
      await adminFetch('/api/admin/integrations', { method: 'PUT', json: { provider, ...body } });
      showToast('Connected', provider === 'email' ? 'Test e-mail sent and settings saved securely.' : `${NAMES[provider]} verified and saved securely.`);
      if (provider === 'shiprocket') setSr({ email: '', password: '' });
      else if (provider === 'razorpay') setRz({ keyId: '', keySecret: '', webhookSecret: '' });
      else if (provider === 'delhivery') setDl({ token: '', environment: 'production' });
      else setEm({ apiKey: '', fromEmail: '', adminEmail: '' });
      load();
      onChanged();
    } catch (err) {
      showToast('Could not connect', errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (provider: Provider) => {
    if (!confirm(`Disconnect ${NAMES[provider]}? It will stop working until it is connected again.`)) return;
    try {
      await adminFetch(`/api/admin/integrations?provider=${provider}`, { method: 'DELETE' });
      load();
      onChanged();
    } catch (err) {
      showToast('Could not disconnect', errorMessage(err), 'error');
    }
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => showToast('Copied', 'Paste it into the provider dashboard.', 'info'), () => undefined);
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!s) return <Spinner />;

  const Status = ({ ok, label }: { ok: boolean; label: string }) => (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold">
      {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-500" />} {label}
    </span>
  );

  return (
    <div className="space-y-6">
      {!s.encryptionReady && <ErrorBox message={`${s.encryptionProblem} Credentials cannot be saved until this is fixed.`} />}
      {s.encryptionReady && s.unreadable.length > 0 && (
        <ErrorBox message={`Saved ${s.unreadable.join(', ')} credentials cannot be unlocked because APP_SECRET is different from when they were saved. Use ONE fixed APP_SECRET for Production (and Preview) in Vercel and never change it — otherwise you will have to enter credentials again after every change. Re-enter them below once.`} />
      )}

      <Card
        title="Shiprocket"
        subtitle="Use a Shiprocket API user (Shiprocket → Settings → API → API Users), not your main login. The password is checked with Shiprocket, then stored encrypted. Nobody — including admins — can view it afterwards."
        actions={s.shiprocket.connected && s.shiprocket.source === 'database' ? <Button variant="ghost" onClick={() => disconnect('shiprocket')}>Disconnect</Button> : null}
      >
        <div className="space-y-3">
          <Status ok={s.shiprocket.connected} label={s.shiprocket.connected ? `Connected as ${s.shiprocket.email}` : 'Not connected'} />
          {s.shiprocket.source === 'env' && <p className="text-xs text-stone-500">Configured by the server environment variables (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD).</p>}
          {s.shiprocket.savedAt && <p className="text-[11px] text-stone-500">Saved {formatDateTime(s.shiprocket.savedAt)} by {s.shiprocket.savedBy}</p>}

          {s.shiprocket.source !== 'env' && (
            <form
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-parchment-50 p-4 rounded-2xl border border-gold-300/40"
              onSubmit={(e) => {
                e.preventDefault();
                save('shiprocket');
              }}
            >
              <Field label="API user email"><Input type="email" required autoComplete="off" value={sr.email} onChange={(e) => setSr({ ...sr, email: e.target.value })} /></Field>
              <Field label="API user password"><Input type="password" required autoComplete="new-password" value={sr.password} onChange={(e) => setSr({ ...sr, password: e.target.value })} /></Field>
              <Button type="submit" loading={busy === 'shiprocket'} disabled={!s.encryptionReady}>{s.shiprocket.connected ? 'Replace & verify' : 'Verify & connect'}</Button>
            </form>
          )}

          {s.shiprocket.connected && s.shiprocketWebhook.token && (
            <div className="text-xs space-y-2 border-t pt-3">
              <p className="font-bold">Tracking webhook — add in Shiprocket → Settings → API → Webhooks:</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-stone-500 w-12">URL</span>
                <code className="bg-stone-100 px-2 py-1 rounded break-all">{s.shiprocketWebhook.url}</code>
                <Button variant="ghost" onClick={() => copy(s.shiprocketWebhook.url)}><Copy className="w-3.5 h-3.5" /></Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-stone-500 w-12">Token</span>
                <code className="bg-stone-100 px-2 py-1 rounded break-all">{s.shiprocketWebhook.token}</code>
                <Button variant="ghost" onClick={() => copy(s.shiprocketWebhook.token!)}><Copy className="w-3.5 h-3.5" /></Button>
              </div>
              <p className="text-stone-500">The webhook needs the live website address — it cannot reach a computer running the store locally.</p>
            </div>
          )}
        </div>
      </Card>

      <Card
        title="Razorpay"
        subtitle="Razorpay Dashboard → Account & Settings → API Keys. Keys are checked with Razorpay, then stored encrypted."
        actions={s.razorpay.connected && s.razorpay.source === 'database' ? <Button variant="ghost" onClick={() => disconnect('razorpay')}>Disconnect</Button> : null}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Status ok={s.razorpay.connected} label={s.razorpay.connected ? `Connected (${s.razorpay.keyId})` : 'Not connected'} />
            {s.razorpay.mode && <Badge className={s.razorpay.mode === 'live' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}>{s.razorpay.mode === 'live' ? 'LIVE mode' : 'TEST mode — no real money'}</Badge>}
            {s.razorpay.connected && <Status ok={s.razorpay.webhookSecretSet} label={s.razorpay.webhookSecretSet ? 'Webhook secret saved' : 'Webhook secret missing'} />}
          </div>
          {s.razorpay.source === 'env' && <p className="text-xs text-stone-500">Configured by the server environment variables (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).</p>}
          {s.razorpay.savedAt && <p className="text-[11px] text-stone-500">Saved {formatDateTime(s.razorpay.savedAt)} by {s.razorpay.savedBy}</p>}

          {s.razorpay.source !== 'env' && (
            <form
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-parchment-50 p-4 rounded-2xl border border-gold-300/40"
              onSubmit={(e) => {
                e.preventDefault();
                save('razorpay');
              }}
            >
              <Field label="Key ID"><Input required autoComplete="off" value={rz.keyId} onChange={(e) => setRz({ ...rz, keyId: e.target.value.trim() })} placeholder="rzp_live_…" /></Field>
              <Field label="Key secret"><Input type="password" required autoComplete="new-password" value={rz.keySecret} onChange={(e) => setRz({ ...rz, keySecret: e.target.value })} /></Field>
              <Field label="Webhook secret"><Input type="password" autoComplete="new-password" value={rz.webhookSecret} onChange={(e) => setRz({ ...rz, webhookSecret: e.target.value })} placeholder="you choose it" /></Field>
              <Button type="submit" loading={busy === 'razorpay'} disabled={!s.encryptionReady}>{s.razorpay.connected ? 'Replace & verify' : 'Verify & connect'}</Button>
            </form>
          )}
          <div className="text-xs space-y-1 border-t pt-3">
            <p className="font-bold">Webhook — add in Razorpay Dashboard → Webhooks:</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="bg-stone-100 px-2 py-1 rounded break-all">{s.razorpayWebhook.url}</code>
              <Button variant="ghost" onClick={() => copy(s.razorpayWebhook.url)}><Copy className="w-3.5 h-3.5" /></Button>
            </div>
            <p className="text-stone-500">Events: {s.razorpayWebhook.events.join(', ')}. Use the same webhook secret you entered above.</p>
            <p className="text-stone-500">After connecting, turn on Razorpay in “Payments & Coupons”.</p>
          </div>
        </div>
      </Card>

      <Card
        title="Delhivery (direct)"
        subtitle="Optional — book directly with your own Delhivery account (Delhivery One → Settings → API Setup → API token). Shiprocket can also ship via Delhivery without this."
        actions={s.delhivery.connected && s.delhivery.source === 'database' ? <Button variant="ghost" onClick={() => disconnect('delhivery')}>Disconnect</Button> : null}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Status ok={s.delhivery.connected} label={s.delhivery.connected ? 'Connected' : 'Not connected'} />
            {s.delhivery.environment && <Badge className={s.delhivery.environment === 'production' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}>{s.delhivery.environment === 'production' ? 'Production' : 'Staging (test)'}</Badge>}
          </div>
          {s.delhivery.savedAt && <p className="text-[11px] text-stone-500">Saved {formatDateTime(s.delhivery.savedAt)} by {s.delhivery.savedBy}</p>}
          {s.delhivery.source !== 'env' && (
            <form className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-parchment-50 p-4 rounded-2xl border border-gold-300/40"
              onSubmit={(e) => { e.preventDefault(); save('delhivery'); }}>
              <Field label="API token"><Input type="password" required autoComplete="new-password" value={dl.token} onChange={(e) => setDl({ ...dl, token: e.target.value })} /></Field>
              <Field label="Environment">
                <select value={dl.environment} onChange={(e) => setDl({ ...dl, environment: e.target.value as 'production' | 'staging' })} className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs bg-white">
                  <option value="production">Production (real shipments)</option>
                  <option value="staging">Staging (test account)</option>
                </select>
              </Field>
              <Button type="submit" loading={busy === 'delhivery'} disabled={!s.encryptionReady}>{s.delhivery.connected ? 'Replace & verify' : 'Verify & connect'}</Button>
            </form>
          )}
          <p className="text-[11px] text-stone-500">After connecting, enter your Delhivery warehouse (pickup location) name in Shipping Setup — it must match the warehouse registered with Delhivery exactly. Delhivery tracking updates are fetched automatically by the scheduled job and the “Sync tracking” button.</p>
        </div>
      </Card>

      <Card
        title="Order e-mails"
        subtitle="Sends order confirmations, shipping e-mails with the tracking link, delivery/cancellation/refund notices to customers, and a new-order alert to you. Uses Resend (resend.com — free for 3,000 e-mails a month)."
        actions={s.email.connected && s.email.source === 'database' ? <Button variant="ghost" onClick={() => disconnect('email')}>Disconnect</Button> : null}
      >
        <div className="space-y-3">
          <Status ok={s.email.connected} label={s.email.connected ? `Sending from ${s.email.fromEmail}${s.email.adminEmail ? ` · alerts to ${s.email.adminEmail}` : ''}` : 'Not connected — no e-mails are sent'} />
          {s.email.savedAt && <p className="text-[11px] text-stone-500">Saved {formatDateTime(s.email.savedAt)} by {s.email.savedBy}</p>}
          {s.email.source !== 'env' && (
            <form className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-parchment-50 p-4 rounded-2xl border border-gold-300/40"
              onSubmit={(e) => { e.preventDefault(); save('email'); }}>
              <Field label="Resend API key"><Input type="password" required autoComplete="new-password" value={em.apiKey} onChange={(e) => setEm({ ...em, apiKey: e.target.value })} placeholder="re_…" /></Field>
              <Field label="From address" hint="A verified domain in Resend"><Input required value={em.fromEmail} onChange={(e) => setEm({ ...em, fromEmail: e.target.value })} placeholder="Store <orders@your-domain.in>" /></Field>
              <Field label="New-order alerts to"><Input type="email" value={em.adminEmail} onChange={(e) => setEm({ ...em, adminEmail: e.target.value })} placeholder="owner@gmail.com" /></Field>
              <Button type="submit" loading={busy === 'email'} disabled={!s.encryptionReady}>Send test & connect</Button>
            </form>
          )}
          <p className="text-[11px] text-stone-500">A test e-mail is sent to the alert address when you connect. Customers get e-mails only if they entered an e-mail at checkout. For automatic SMS/WhatsApp tracking messages, switch on customer notifications in your Shiprocket panel.</p>
        </div>
      </Card>
    </div>
  );
}
