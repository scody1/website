'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Download, MessageCircle } from 'lucide-react';
import { adminFetch, errorMessage } from '@/lib/api';
import { formatDate, formatINR, formatWhatsAppUrl } from '@/lib/shared/format';
import { Button, Card, ErrorBox, Input, Spinner } from './ui';
import { useAdmin } from './AdminApp';

interface Customer { phone: string; name: string; email: string; city: string; state: string; orders: number; spent: number; last_order: string }

export default function TabCustomers() {
  const { can } = useAdmin();
  const [rows, setRows] = useState<Customer[] | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (query = '') => {
    setError(null);
    try {
      const { customers } = await adminFetch<{ customers: Customer[] }>(`/api/admin/customers${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      setRows(customers);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card
      title="Customers"
      subtitle="Built from orders. Contact customers only about their orders unless they opted in to marketing."
      actions={
        can('customers.export') && <a href="/api/admin/orders/export?kind=customers" className="inline-flex items-center gap-1.5 bg-stone-800 text-amber-100 font-bold px-3 py-2 rounded-xl text-xs">
          <Download className="w-3.5 h-3.5" /> Customers CSV
        </a>
      }
    >
      <form className="flex gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); load(q.trim()); }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone or email" />
        <Button type="submit" variant="ghost">Search</Button>
      </form>
      {error ? <ErrorBox message={error} onRetry={() => load(q)} /> : !rows ? <Spinner /> : rows.length === 0 ? (
        <p className="text-center text-xs text-stone-500 py-8">No customers yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-parchment-100 text-maroon-700 text-[10px] uppercase">
              <tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Phone</th><th className="p-2 text-left">Email</th><th className="p-2 text-left">City</th><th className="p-2 text-left">Orders</th><th className="p-2 text-left">Spent</th><th className="p-2 text-left">Last order</th><th className="p-2" /></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((c) => (
                <tr key={c.phone}>
                  <td className="p-2 font-bold">{c.name}</td>
                  <td className="p-2 font-mono">{c.phone}</td>
                  <td className="p-2">{c.email || '—'}</td>
                  <td className="p-2">{c.city}, {c.state}</td>
                  <td className="p-2">{c.orders}</td>
                  <td className="p-2 font-bold">{formatINR(c.spent)}</td>
                  <td className="p-2">{formatDate(c.last_order)}</td>
                  <td className="p-2 text-right">
                    <a href={formatWhatsAppUrl(c.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
