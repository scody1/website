'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { adminFetch, errorMessage } from '@/lib/api';
import { formatINR } from '@/lib/shared/format';
import { ORDER_STATUS_LABEL } from '@/lib/shared/orderStatus';
import type { OrderStatus } from '@/lib/shared/types';
import { Card, ErrorBox, Select, Spinner } from './ui';

interface Analytics {
  days: number;
  orders: number;
  revenue: number;
  productRevenue: number;
  cogs: number;
  discounts: number;
  shippingCollected: number;
  shippingCost: number;
  missingShippingCost: number;
  netProfit: number;
  marginPercent: number;
  codPending: number;
  codCollected: number;
  prepaidPaid: number;
  awaitingVerification: number;
  cancelled: number;
  rto: number;
  refunded: number;
  lostValue: number;
  daily: { day: string; orders: number; revenue: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
  statusCounts: Record<string, number>;
  lowStock: { id: string; name: string; sku: string; stock: number }[];
}

export default function TabAnalytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setData(null);
    try {
      setData(await adminFetch<Analytics>(`/api/admin/analytics?days=${days}`));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [days]);
  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;

  const maxRevenue = data ? Math.max(1, ...data.daily.map((d) => d.revenue)) : 1;

  return (
    <div className="space-y-5">
      <Card
        title="Sales & profit"
        subtitle="Counts confirmed orders only (excludes awaiting payment, cancelled, RTO and refunded)."
        actions={
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-40">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 12 months</option>
            <option value={3650}>All time</option>
          </Select>
        }
      >
        {!data ? <Spinner /> : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Orders" value={String(data.orders)} />
            <Kpi label="Revenue (incl. shipping)" value={formatINR(data.revenue)} />
            <Kpi label="Cost of goods" value={formatINR(data.cogs)} />
            <Kpi label={`Net profit (${data.marginPercent}%)`} value={formatINR(data.netProfit)} tone={data.netProfit < 0 ? 'bad' : 'good'} />
            <Kpi label="Discounts given" value={formatINR(data.discounts)} />
            <Kpi label="Shipping + COD fees collected" value={formatINR(data.shippingCollected)} />
            <Kpi label="Courier cost recorded" value={formatINR(data.shippingCost)} hint={data.missingShippingCost ? `${data.missingShippingCost} order(s) without a recorded cost` : undefined} />
            <Kpi label="Cancelled / RTO / refunded" value={`${data.cancelled} / ${data.rto} / ${data.refunded}`} hint={formatINR(data.lostValue)} />
          </div>
        )}
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card title="Cash flow">
              <ul className="text-xs space-y-2">
                <li className="flex justify-between"><span>Prepaid received</span><strong>{formatINR(data.prepaidPaid)}</strong></li>
                <li className="flex justify-between"><span>COD collected (delivered)</span><strong>{formatINR(data.codCollected)}</strong></li>
                <li className="flex justify-between"><span>COD still with courier / in transit</span><strong className="text-amber-700">{formatINR(data.codPending)}</strong></li>
                <li className="flex justify-between"><span>UPI awaiting your verification</span><strong className="text-purple-700">{formatINR(data.awaitingVerification)}</strong></li>
              </ul>
              <p className="text-[10px] text-stone-500 mt-3">COD money reaches you through Shiprocket remittance; match it in the Shiprocket panel.</p>
            </Card>
            <Card title="Top products">
              {data.topProducts.length === 0 ? <p className="text-xs text-stone-500">No sales in this period.</p> : (
                <ul className="text-xs space-y-1.5">
                  {data.topProducts.map((p) => (
                    <li key={p.name} className="flex justify-between gap-2"><span className="truncate">{p.name}</span><span className="whitespace-nowrap">{p.units} · {formatINR(p.revenue)}</span></li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Low stock (≤5)">
              {data.lowStock.length === 0 ? <p className="text-xs text-stone-500">All good.</p> : (
                <ul className="text-xs space-y-1.5">
                  {data.lowStock.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2"><span className="truncate">{p.name}</span><strong className={p.stock === 0 ? 'text-rose-700' : 'text-amber-700'}>{p.stock}</strong></li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Daily revenue">
            {data.daily.length === 0 ? <p className="text-xs text-stone-500">No orders in this period.</p> : (
              <div className="flex items-end gap-1 h-40 overflow-x-auto">
                {data.daily.map((d) => (
                  <div key={d.day} className="flex flex-col items-center justify-end min-w-[18px] flex-1 h-full" title={`${d.day}: ${formatINR(d.revenue)} (${d.orders} orders)`}>
                    <div className="w-full bg-maroon-700 rounded-t" style={{ height: `${Math.max(2, (d.revenue / maxRevenue) * 100)}%` }} />
                    <span className="text-[8px] text-stone-400 mt-1">{d.day.slice(8)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="All orders by status">
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(data.statusCounts).map(([s, c]) => (
                <span key={s} className="bg-stone-100 rounded-full px-3 py-1">{ORDER_STATUS_LABEL[s as OrderStatus] || s}: <strong>{c}</strong></span>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="bg-parchment-50 border border-gold-300/40 rounded-2xl p-3">
      <p className="text-[11px] text-stone-500 font-semibold">{label}</p>
      <p className={`text-lg font-serif font-extrabold mt-1 ${tone === 'bad' ? 'text-rose-700' : tone === 'good' ? 'text-emerald-700' : 'text-maroon-700'}`}>{value}</p>
      {hint && <p className="text-[10px] text-stone-500">{hint}</p>}
    </div>
  );
}
