'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { adminFetch, errorMessage } from '@/lib/api';
import { formatDateTime, formatINR } from '@/lib/shared/format';
import { ALL_ORDER_STATUSES, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, statusBadgeClass } from '@/lib/shared/orderStatus';
import type { AdminOrder } from '@/lib/shared/types';
import { Badge, Button, Card, ErrorBox, Input, Select, Spinner } from './ui';
import OrderDrawer from './OrderDrawer';
import { useAdmin } from './AdminApp';

interface ListResponse { orders: AdminOrder[]; total: number; page: number; pageSize: number }

export default function TabOrders({ onChanged }: { onChanged: () => void }) {
  const { can } = useAdmin();
  const [status, setStatus] = useState('');
  const [payment, setPayment] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (status) qs.set('status', status);
      if (payment) qs.set('payment', payment);
      if (search) qs.set('q', search);
      setData(await adminFetch<ListResponse>(`/api/admin/orders?${qs}`));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, status, payment, search]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <Card
        title={`Orders${data ? ` (${data.total})` : ''}`}
        subtitle="Click an order to verify payment, change status, book Shiprocket and print the invoice."
        actions={
          <>
            {can('orders.export') && <a href="/api/admin/orders/export" className="inline-flex items-center gap-1.5 bg-stone-800 hover:bg-stone-900 text-amber-100 font-bold px-3 py-2 rounded-xl text-xs">
              <Download className="w-3.5 h-3.5" /> Orders CSV
            </a>}
            <Button variant="ghost" onClick={load} loading={loading}><RefreshCw className="w-3.5 h-3.5" /> Refresh</Button>
          </>
        }
      >
        <form
          className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(q.trim());
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order no., name, phone, AWB, UTR" className="sm:col-span-2" />
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {ALL_ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
          </Select>
          <Select value={payment} onChange={(e) => { setPayment(e.target.value); setPage(1); }}>
            <option value="">All payments</option>
            {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </form>

        {error ? <ErrorBox message={error} onRetry={load} /> : !data ? <Spinner /> : data.orders.length === 0 ? (
          <p className="text-center text-xs text-stone-500 py-10">No orders match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-espresso">
              <thead className="bg-parchment-100 text-maroon-700 text-[10px] uppercase">
                <tr>
                  <th className="p-2 text-left">Order</th><th className="p-2 text-left">Customer</th><th className="p-2 text-left">Items</th>
                  <th className="p-2 text-left">Total</th><th className="p-2 text-left">Payment</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Courier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.orders.map((o) => (
                  <tr key={o.id} onClick={() => setOpenId(o.id)} className="cursor-pointer hover:bg-parchment-50">
                    <td className="p-2">
                      <p className="font-mono font-bold text-maroon-700">{o.orderNumber}</p>
                      <p className="text-[10px] text-stone-500">{formatDateTime(o.createdAt)}</p>
                    </td>
                    <td className="p-2">
                      <p className="font-bold">{o.customer.name}</p>
                      <p className="text-[10px] text-stone-500">{o.customer.phone} • {o.customer.city} {o.customer.pincode}</p>
                    </td>
                    <td className="p-2 max-w-[220px] truncate">{o.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}</td>
                    <td className="p-2 font-bold">{formatINR(o.total)}</td>
                    <td className="p-2">
                      <p className="font-semibold">{o.paymentMethod}</p>
                      <Badge className={
                        o.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : o.paymentStatus === 'AWAITING_VERIFICATION' ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : o.paymentStatus === 'FAILED' ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-stone-50 text-stone-600 border-stone-200'
                      }>{PAYMENT_STATUS_LABEL[o.paymentStatus]}</Badge>
                    </td>
                    <td className="p-2"><Badge className={statusBadgeClass(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Badge></td>
                    <td className="p-2 text-[10px]">
                      {o.shipping.awbCode ? <><p className="font-bold">{o.shipping.courierName}</p><p className="font-mono">{o.shipping.awbCode}</p></> : <span className="text-stone-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && pages > 1 && (
          <div className="flex items-center justify-end gap-2 mt-4 text-xs">
            <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span>Page {page} of {pages}</span>
            <Button variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </Card>

      {openId && (
        <OrderDrawer
          orderId={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => {
            load();
            onChanged();
          }}
        />
      )}
    </div>
  );
}
