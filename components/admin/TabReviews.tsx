'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { adminFetch, errorMessage } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { AdminReview } from '@/lib/shared/types';
import { Badge, Button, Card, ErrorBox, Spinner, Toggle } from './ui';
import { useAdmin } from './AdminApp';

export default function TabReviews({ onChanged }: { onChanged: () => void }) {
  const { can } = useAdmin();
  const moderate = can('reviews.moderate');
  const { showToast } = useToast();
  const [rows, setRows] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { reviews } = await adminFetch<{ reviews: AdminReview[] }>('/api/admin/reviews');
      setRows(reviews);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const patch = async (r: AdminReview, body: { isApproved?: boolean; isVerifiedBuyer?: boolean }) => {
    try {
      await adminFetch(`/api/admin/reviews/${r.id}`, { method: 'PATCH', json: body });
      setRows((list) => list?.map((x) => (x.id === r.id ? { ...x, ...body } : x)) || null);
      onChanged();
    } catch (err) {
      showToast('Update failed', errorMessage(err), 'error');
    }
  };

  const remove = async (r: AdminReview) => {
    if (!confirm('Delete this review permanently?')) return;
    try {
      await adminFetch(`/api/admin/reviews/${r.id}`, { method: 'DELETE' });
      setRows((list) => list?.filter((x) => x.id !== r.id) || null);
      onChanged();
    } catch (err) {
      showToast('Delete failed', errorMessage(err), 'error');
    }
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!rows) return <Spinner />;

  return (
    <Card title="Customer reviews" subtitle="New reviews stay hidden until you approve them. Only approved reviews count toward product ratings.">
      {rows.length === 0 ? <p className="text-xs text-stone-500 text-center py-8">No reviews yet.</p> : (
        <ul className="divide-y divide-stone-100">
          {rows.map((r) => (
            <li key={r.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex">{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />)}</span>
                  <strong>{r.title || 'Untitled'}</strong>
                  {r.isApproved ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Published</Badge> : <Badge className="bg-amber-50 text-amber-800 border-amber-200">Pending</Badge>}
                  {r.isVerifiedBuyer && <Badge className="bg-sky-50 text-sky-700 border-sky-200">Verified buyer{r.orderNumber ? ` · ${r.orderNumber}` : ''}</Badge>}
                </div>
                <p className="text-stone-700">“{r.comment}”</p>
                <p className="text-stone-400">{r.authorName}{r.location ? `, ${r.location}` : ''} · {r.date}{r.productName ? ` · ${r.productName}` : ''}</p>
              </div>
              {moderate && <div className="flex items-center gap-3 shrink-0">
                <Toggle checked={r.isVerifiedBuyer} onChange={(v) => patch(r, { isVerifiedBuyer: v })} label="Verified" />
                <Button variant={r.isApproved ? 'ghost' : 'success'} onClick={() => patch(r, { isApproved: !r.isApproved })}>{r.isApproved ? 'Hide' : 'Approve'}</Button>
                <button onClick={() => remove(r)} className="text-rose-600 p-1" aria-label="Delete review"><Trash2 className="w-4 h-4" /></button>
              </div>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
