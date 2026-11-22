'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { adminFetch, errorMessage } from '@/lib/api';
import { useAdmin } from './AdminApp';
import { Badge, Button, Card } from './ui';

interface PickupLocation { pickup_location: string; address: string; city: string; state: string; pin_code: string; phone: string }

export default function TabShipping() {
  const { settings, status, saveSection, can, goTo } = useAdmin();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string; pickupLocations?: PickupLocation[] } | null>(null);
  const i = status?.integrations;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = i?.siteUrl || origin;

  const test = async () => {
    setTesting(true);
    try {
      setResult(await adminFetch('/api/admin/shiprocket', { method: 'POST' }));
    } catch (err) {
      setResult({ ok: false, error: errorMessage(err) });
    } finally {
      setTesting(false);
    }
  };

  const choose = (name: string, loc: PickupLocation) =>
    saveSection('business', {
      ...settings.business,
      shiprocketPickupNickname: name,
      pincode: settings.business.pincode || loc.pin_code,
      city: settings.business.city || loc.city,
      state: settings.business.state || loc.state
    });

  const Check = ({ ok, label }: { ok?: boolean; label: string }) => (
    <li className="flex items-center gap-2 text-xs">
      {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-500" />} {label}
    </li>
  );

  return (
    <div className="space-y-6">
      <Card
        title="Shiprocket connection"
        subtitle="The Shiprocket login is entered once by a Super Admin in Integrations (stored encrypted). Here you choose the pickup location and check the connection."
        actions={<Button onClick={test} loading={testing} disabled={!i?.shiprocket}>Test connection</Button>}
      >
        <ul className="space-y-2">
          <Check ok={i?.shiprocket} label={i?.shiprocket ? 'Shiprocket account connected' : 'Shiprocket not connected yet'} />
          {!i?.shiprocket && can('integrations.manage') && (
            <li><button onClick={() => goTo('integrations')} className="text-xs font-bold text-saffron-700 underline">Connect Shiprocket in Integrations →</button></li>
          )}
          <Check ok={Boolean(settings.business.shiprocketPickupNickname)} label={`Pickup location: ${settings.business.shiprocketPickupNickname || 'not chosen'}`} />
          <Check ok={Boolean(settings.business.pincode)} label={`Pickup pincode: ${settings.business.pincode || 'not set'}`} />
          <Check ok={i?.shiprocketWebhook} label="Tracking webhook token created (copy it from Integrations into Shiprocket)" />
          <Check ok={i?.cron} label="CRON_SECRET set (backup tracking sync every run)" />
        </ul>

        {result && (
          <div className={`mt-4 p-3 rounded-xl text-xs ${result.ok ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200 text-rose-800'}`}>
            {result.ok ? (
              <>
                <p className="font-bold text-emerald-800 mb-2">Connected. Choose the pickup location to ship from:</p>
                {result.pickupLocations?.length ? (
                  <ul className="divide-y">
                    {result.pickupLocations.map((l) => (
                      <li key={l.pickup_location} className="py-2 flex items-center justify-between gap-2">
                        <span>
                          <strong>{l.pickup_location}</strong> — {l.address}, {l.city}, {l.state} {l.pin_code}
                        </span>
                        {settings.business.shiprocketPickupNickname === l.pickup_location ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Selected</Badge>
                        ) : (
                          <Button variant="ghost" onClick={() => choose(l.pickup_location, l)}>Use this</Button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No pickup locations found. Add one in Shiprocket → Settings → Pickup Addresses and verify it.</p>
                )}
              </>
            ) : (
              <p>{result.error}</p>
            )}
          </div>
        )}
      </Card>

      <Card title="How shipping works">
        <ol className="list-decimal pl-5 space-y-1.5 text-xs text-stone-700">
          <li>Open an order in the <strong>Orders</strong> tab. Prepaid orders must be paid/verified first.</li>
          <li>Optionally press <em>Compare courier rates</em> and pick a courier, then <em>Book</em>.</li>
          <li>The app creates the Shiprocket order (with real product weights and the correct COD amount), assigns the AWB, schedules pickup and downloads the label PDF.</li>
          <li>If Shiprocket returns an error (low wallet balance, unserviceable pincode, wrong pickup name…) you see the exact message and can retry. Fake tracking numbers are never generated.</li>
          <li>Status updates arrive through the webhook below and are also re-checked by the scheduled job.</li>
        </ol>
      </Card>

      {i?.delhivery && <DelhiveryWarehouse />}

      <Card title="Webhook setup (Shiprocket → Settings → API → Webhooks)">
        <div className="text-xs space-y-2">
          <p>URL: <code className="bg-stone-100 px-1.5 py-0.5 rounded">{base}/api/webhooks/tracking</code></p>
          <p>Token / x-api-key: shown to the Super Admin in <strong>Integrations</strong>.</p>
          <p className="text-stone-500">Shiprocket does not accept webhook URLs containing the words “shiprocket”, “kartrocket”, “sr” or “kr”, which is why the path is /tracking.</p>
        </div>
      </Card>
    </div>
  );
}

function DelhiveryWarehouse() {
  const { settings, saveSection } = useAdmin();
  const [name, setName] = useState(settings.business.delhiveryPickupName);
  const [saving, setSaving] = useState(false);
  return (
    <Card title="Delhivery warehouse" subtitle="The pickup location (client warehouse) name exactly as registered in your Delhivery account. Pickups are requested at this address.">
      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          await saveSection('business', { ...settings.business, delhiveryPickupName: name.trim() });
          setSaving(false);
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. RAJESHWAR-HOME" className="flex-1 border border-stone-300 rounded-xl px-3 py-2 text-xs" aria-label="Delhivery warehouse name" />
        <Button type="submit" loading={saving}>Save</Button>
      </form>
    </Card>
  );
}
