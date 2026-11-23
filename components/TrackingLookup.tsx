'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, ExternalLink, Home, Package, Search, Truck } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api';
import { useStore } from '@/lib/storeContext';
import type { PublicTracking } from '@/lib/shared/types';
import { ORDER_STATUS_LABEL, TRACKING_STEPS, trackingStepIndex } from '@/lib/shared/orderStatus';
import { formatDateTime, formatINR } from '@/lib/shared/format';

const ICONS = [CheckCircle2, Package, Truck, Clock, Home];

/** Order tracking form + result. Requires order number AND phone so orders stay private. */
export default function TrackingLookup({ compact = false }: { compact?: boolean }) {
  const { trackingQuery, setTrackingQuery } = useStore();
  const [orderNumber, setOrderNumber] = useState(trackingQuery || '');
  const [phone, setPhone] = useState('');
  const [mode, setMode] = useState<'order' | 'awb'>('order');
  const [awb, setAwb] = useState('');
  const [result, setResult] = useState<PublicTracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (trackingQuery) setOrderNumber(trackingQuery);
  }, [trackingQuery]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (mode === 'awb' ? awb.trim().length < 6 : !orderNumber.trim() || phone.replace(/\D/g, '').length < 10) {
      setError(mode === 'awb' ? 'Enter the courier AWB / tracking number.' : 'Enter your order number and the 10-digit mobile number used at checkout.');
      return;
    }
    setLoading(true);
    try {
      const { tracking } = await apiFetch<{ tracking: PublicTracking }>('/api/track', {
        method: 'POST',
        json: mode === 'awb' ? { awb: awb.trim() } : { orderNumber: orderNumber.trim(), phone }
      });
      setResult(tracking);
      if (mode === 'order') setTrackingQuery(orderNumber.trim());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const step = result ? trackingStepIndex(result.status) : -1;

  return (
    <div>
      <div className={`flex gap-2 text-[11px] font-bold ${compact ? 'mb-2' : 'max-w-2xl mx-auto mt-6 mb-2'}`}>
        {(['order', 'awb'] as const).map((m) => (
          <button key={m} type="button" onClick={() => { setMode(m); setError(null); setResult(null); }}
            className={`px-3 py-1.5 rounded-full border ${mode === m ? 'bg-gold-500 text-stone-950 border-gold-300' : 'border-stone-600 text-stone-300 hover:border-gold-400'}`}>
            {m === 'order' ? 'Order number + mobile' : 'Courier AWB number'}
          </button>
        ))}
      </div>
      {mode === 'awb' ? (
        <form onSubmit={handleSearch} className={`grid gap-2 ${compact ? 'grid-cols-1 sm:grid-cols-[1fr_auto]' : 'max-w-2xl mx-auto grid-cols-1 sm:grid-cols-[1fr_auto]'}`}>
          <input
            type="text"
            value={awb}
            onChange={(e) => setAwb(e.target.value.toUpperCase())}
            placeholder="AWB / tracking number from your shipping message"
            aria-label="AWB number"
            className="bg-stone-800/90 border border-gold-500/50 focus:border-gold-400 rounded-xl px-4 py-3 text-xs sm:text-sm text-parchment-100 placeholder:text-stone-400 focus:outline-none"
          />
          <button type="submit" disabled={loading} className="bg-saffron-500 hover:bg-saffron-600 disabled:opacity-60 text-white font-bold px-5 py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5">
            <Search className="w-4 h-4" /><span>{loading ? 'Searching…' : 'Track'}</span>
          </button>
        </form>
      ) : (
      <form onSubmit={handleSearch} className={`grid gap-2 ${compact ? 'grid-cols-1 sm:grid-cols-[1fr_1fr_auto]' : 'max-w-2xl mx-auto mt-6 grid-cols-1 sm:grid-cols-[1fr_1fr_auto]'}`}>
        <input
          type="text"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
          placeholder="Order number (e.g. RPS-100001)"
          aria-label="Order number"
          className="bg-stone-800/90 border border-gold-500/50 focus:border-gold-400 rounded-xl px-4 py-3 text-xs sm:text-sm text-parchment-100 placeholder:text-stone-400 focus:outline-none"
        />
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="Mobile number used at checkout"
          aria-label="Mobile number"
          className="bg-stone-800/90 border border-gold-500/50 focus:border-gold-400 rounded-xl px-4 py-3 text-xs sm:text-sm text-parchment-100 placeholder:text-stone-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-saffron-500 hover:bg-saffron-600 disabled:opacity-60 text-white font-bold px-5 py-3 rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? 'Searching…' : 'Track'}</span>
        </button>
      </form>
      )}

      {error && (
        <div className="mt-5 text-center py-4 bg-stone-800/60 rounded-2xl border border-stone-700 text-sm text-gold-300 font-semibold">
          {error}
        </div>
      )}

      {result && (
        <div className={`space-y-5 animate-fadeIn ${compact ? 'mt-5' : 'mt-8 pt-8 border-t border-gold-500/30 max-w-3xl mx-auto'}`}>
          <div className="bg-stone-800/90 border border-gold-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Order</span>
              <h3 className="font-serif text-lg font-bold text-gold-300">#{result.orderNumber}</h3>
              <p className="text-xs text-stone-300 mt-0.5">
                {result.firstName ? `${result.firstName} • ${result.city} (${result.pincode}) • ` : ''}placed {formatDateTime(result.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-saffron-500/20 border border-saffron-400 text-saffron-300 px-3 py-1 rounded-full text-xs font-bold">
                {ORDER_STATUS_LABEL[result.status]}
              </span>
              {result.total > 0 && (
                <p className="text-[11px] text-stone-400 mt-1">
                  {result.paymentMethod} • {formatINR(result.total)}
                </p>
              )}
              {result.etd && result.status !== 'DELIVERED' && (
                <p className="text-[11px] text-emerald-300 font-bold mt-1">Expected delivery: {result.etd}</p>
              )}
            </div>
          </div>

          {step >= 0 ? (
            <div className="grid grid-cols-5 gap-1">
              {TRACKING_STEPS.map((label, idx) => {
                const Icon = ICONS[idx];
                const done = idx <= step;
                return (
                  <div key={label} className="flex flex-col items-center text-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                        done ? 'bg-gold-500 border-gold-300 text-stone-950' : 'bg-stone-800 border-stone-700 text-stone-500'
                      } ${idx === step ? 'ring-4 ring-gold-400/30' : ''}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] sm:text-xs mt-2 leading-tight ${done ? 'text-gold-200 font-bold' : 'text-stone-500'}`}>{label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-stone-800/80 border border-rose-500/40 rounded-xl p-4 text-xs text-rose-200">
              {result.status === 'PENDING_PAYMENT'
                ? 'This order is waiting for online payment. It will be cancelled automatically if payment is not completed.'
                : `This order is ${ORDER_STATUS_LABEL[result.status].toLowerCase()}.`}
            </div>
          )}

          {result.awbCode ? (
            <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-4 text-xs space-y-2 text-emerald-200">
              <div className="flex justify-between gap-2">
                <span className="text-emerald-400 font-semibold">Courier</span>
                <span className="font-semibold text-white">{result.courierName || 'Courier partner'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-300 font-semibold">AWB / Tracking number</span>
                <span className="font-mono font-bold text-gold-300">{result.awbCode}</span>
              </div>
              {result.shippingStatus && (
                <div className="flex justify-between gap-2">
                  <span className="text-stone-300 font-semibold">Latest courier update</span>
                  <span className="text-white text-right">{result.shippingStatus}</span>
                </div>
              )}
              {result.trackingUrl && (
                <a href={result.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-saffron-400 hover:text-saffron-300 font-bold underline pt-1">
                  <span>Open courier tracking page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ) : (
            step >= 0 && (
              <div className="bg-stone-800/80 border border-gold-500/30 rounded-xl p-4 text-xs text-stone-300">
                <p className="font-semibold text-gold-300">Preparing your parcel</p>
                <p className="text-stone-400 mt-0.5">The courier tracking number will appear here once the parcel is handed to the courier.</p>
              </div>
            )
          )}

          {result.activities.length > 0 && (
            <div className="bg-stone-800/70 border border-gold-500/30 rounded-xl p-4">
              <p className="text-xs font-bold text-gold-300 mb-2">
                Live courier updates{result.courierName ? ` — ${result.courierName}` : ''}
                {result.lastSynced && <span className="font-normal text-stone-500"> · updated {formatDateTime(result.lastSynced)}</span>}
              </p>
              <ol className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {result.activities.map((a, i) => (
                  <li key={i} className={`border-l-2 pl-3 text-xs ${i === 0 ? 'border-saffron-400 text-parchment-100' : 'border-stone-600 text-stone-300'}`}>
                    <p className={i === 0 ? 'font-bold' : ''}>{a.activity}</p>
                    <p className="text-[10px] text-stone-500">{a.date}{a.location ? ` · ${a.location}` : ''}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {result.events.length > 0 && (
            <ul className="text-[11px] text-stone-400 space-y-1 border-t border-stone-700 pt-3">
              {result.events.slice(0, 6).map((ev, i) => (
                <li key={i}>
                  <span className="text-stone-500">{formatDateTime(ev.createdAt)}</span> — {ev.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
