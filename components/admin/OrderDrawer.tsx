'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, MessageCircle, Printer, Truck } from 'lucide-react';
import { adminFetch, errorMessage } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { formatDateTime, formatINR, formatWhatsAppUrl } from '@/lib/shared/format';
import { allowedNextStatuses, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, statusBadgeClass } from '@/lib/shared/orderStatus';
import type { AdminOrder, OrderStatus } from '@/lib/shared/types';
import { useAdmin } from './AdminApp';
import { Badge, Button, ErrorBox, Field, Input, Modal, Select, Spinner, Textarea } from './ui';
import PrintInvoiceModal from './PrintInvoiceModal';

interface Rates {
  package: { weightKg: number; lengthCm: number; breadthCm: number; heightCm: number };
  recommendedId: number | null;
  couriers: { id: number; name: string; rate: number; etd: string | null; estimatedDays: number | null; cod: boolean; rating: number | null }[];
}

export default function OrderDrawer({ orderId, onClose, onChanged }: { orderId: string; onClose: () => void; onChanged: () => void }) {
  const { showToast } = useToast();
  const { settings, status, can } = useAdmin();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [notes, setNotes] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [rates, setRates] = useState<Rates | null>(null);
  const [courierId, setCourierId] = useState<number | null>(null);
  const [pkg, setPkg] = useState<Rates['package'] | null>(null);
  const [manual, setManual] = useState({ courierName: '', awbCode: '', trackingUrl: '' });
  const [printing, setPrinting] = useState(false);
  const [dlQuote, setDlQuote] = useState<{ serviceable: boolean; cod: boolean; rate: number | null } | null>(null);
  const [refund, setRefund] = useState({ amount: '', note: '' });

  const apply = (o: AdminOrder) => {
    setOrder(o);
    setNotes(o.adminNotes);
    setShippingCost(o.shipping.shippingCost === null ? '' : String(o.shipping.shippingCost));
    setNextStatus('');
    setStatusNote('');
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const { order } = await adminFetch<{ order: AdminOrder }>(`/api/admin/orders/${orderId}`);
      apply(order);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [orderId]);
  useEffect(() => {
    load();
  }, [load]);

  const run = async <T,>(key: string, fn: () => Promise<T>, success?: string): Promise<T | null> => {
    setBusy(key);
    try {
      const res = await fn();
      if (success) showToast('Done', success);
      onChanged();
      return res;
    } catch (err) {
      showToast('Action failed', errorMessage(err), 'error');
      load(); // completed steps may have been saved — show the latest state
      return null;
    } finally {
      setBusy(null);
    }
  };

  if (error) return <Modal title="Order" onClose={onClose}><ErrorBox message={error} onRetry={load} /></Modal>;
  if (!order) return <Modal title="Order" onClose={onClose}><Spinner /></Modal>;

  const o = order;
  const s = o.shipping;
  // Refunds go through the refund panel (so money and records stay in sync), not the status list.
  const next = can('orders.status') ? allowedNextStatuses(o.status).filter((st) => st !== 'REFUNDED' && (st !== 'CANCELLED' || can('orders.cancel'))) : [];
  const refundable = o.total - (o.refundAmount || 0);
  const dlConnected = Boolean(status?.integrations.delhivery);
  const canShip = can('shipping.book');
  const isPrepaidUnpaid = o.paymentMethod !== 'COD' && o.paymentStatus !== 'PAID';
  const shippable = !['PENDING_PAYMENT', 'CANCELLED', 'REFUNDED', 'RTO', 'DELIVERED'].includes(o.status) && !isPrepaidUnpaid;
  const canShipSr = Boolean(status?.integrations.shiprocket) && shippable && s.provider !== 'MANUAL' && s.provider !== 'DELHIVERY';
  const canShipDl = dlConnected && shippable && !s.srShipmentId && (s.provider === null || s.provider === 'DELHIVERY') && !(s.awbCode && s.pickupScheduledFor);
  const srDone = Boolean(s.awbCode && s.pickupScheduledFor);

  const changeStatus = (target: OrderStatus | '' = nextStatus) =>
    target &&
    run('status', async () => {
      const nextStatus = target;
      const paidOnline = o.paymentStatus === 'PAID' && o.paymentMethod === 'RAZORPAY' && o.razorpayPaymentId;
      if (nextStatus === 'CANCELLED' && !confirm(
        `Cancel this order? Stock will be returned to inventory${s.awbCode ? ' and the courier shipment cancelled' : ''}.`
        + (paidOnline && refundable > 0 ? `\n\n${formatINR(refundable)} will be refunded to the customer through Razorpay automatically.` : '')
        + (o.paymentStatus === 'PAID' && !paidOnline && refundable > 0 ? `\n\nThe customer paid ${formatINR(refundable)} — you must pay it back yourself and record it in the Refund panel.` : '')
      )) return null;
      const res = await adminFetch<{ order: AdminOrder; warning: string | null; refund?: string; refundAmount?: number }>(`/api/admin/orders/${o.id}/status`, { method: 'POST', json: { status: nextStatus, note: statusNote } });
      apply(res.order);
      if (res.refund === 'razorpay') showToast('Refund sent', `${formatINR(res.refundAmount || 0)} refunded through Razorpay.`, 'success');
      if (res.refund === 'manual_due') showToast('Refund due', `Pay ${formatINR(res.refundAmount || 0)} back to the customer and record it in the Refund panel.`, 'warn');
      if (res.warning) showToast('Needs attention', res.warning, 'warn');
      onChanged();
      return res;
    }, `Status changed to ${ORDER_STATUS_LABEL[target]}.`);

  const decideReturn = (rid: string, status: 'APPROVED' | 'REJECTED' | 'COMPLETED') =>
    run(`ret-${rid}`, async () => {
      const note = status === 'APPROVED' ? '' : prompt(status === 'REJECTED' ? 'Reason for declining the return (the customer sees this):' : 'Note (optional), e.g. parcel received back:') ?? null;
      if (note === null) return null;
      const res = await adminFetch<{ order: AdminOrder }>(`/api/admin/orders/${o.id}/returns/${rid}`, { method: 'POST', json: { status, note } });
      apply(res.order);
      onChanged();
      return res;
    }, `Return request ${status.toLowerCase()}.`);

  const verify = (approve: boolean) =>
    run('verify', async () => {
      const note = approve ? '' : prompt('Reason for rejecting this UPI payment (shown in order history):') ?? '';
      if (!approve && !confirm('Reject the payment and cancel the order?')) return null;
      const res = await adminFetch<{ order: AdminOrder }>(`/api/admin/orders/${o.id}/payment`, { method: 'POST', json: { approve, note } });
      apply(res.order);
      return res;
    }, approve ? 'Payment marked as received.' : 'Payment rejected and order cancelled.');

  const shipping = (action: string, extra: Record<string, unknown> = {}, msg?: string) =>
    run(action, async () => {
      const res = await adminFetch<{ order?: AdminOrder; url?: string }>(`/api/admin/orders/${o.id}/shipping`, { method: 'POST', json: { action, ...extra } });
      if (res.order) apply(res.order);
      if (res.url) window.open(res.url, '_blank', 'noopener');
      return res;
    }, msg);

  const loadRates = () =>
    run('rates', async () => {
      const r = await adminFetch<Rates>(`/api/admin/orders/${o.id}/shipping`, { method: 'POST', json: { action: 'rates', weightKg: pkg?.weightKg } });
      setRates(r);
      if (!pkg) setPkg(r.package);
      setCourierId(r.recommendedId ?? r.couriers[0]?.id ?? null);
      return r;
    });

  const saveMeta = (body: Record<string, unknown>, msg: string) =>
    run('meta', async () => {
      const res = await adminFetch<{ order: AdminOrder }>(`/api/admin/orders/${o.id}`, { method: 'PATCH', json: body });
      apply(res.order);
      return res;
    }, msg);

  const customerMsg = s.awbCode
    ? `🙏 Namaste ${o.customer.name}! Your order #${o.orderNumber} from ${settings.store.storeName} has been shipped via ${s.courierName || 'our courier'}. AWB: ${s.awbCode}${s.trackingUrl ? `. Track: ${s.trackingUrl}` : ''}`
    : `🙏 Namaste ${o.customer.name}! Your order #${o.orderNumber} (${formatINR(o.total)}) from ${settings.store.storeName} is ${ORDER_STATUS_LABEL[o.status].toLowerCase()}. We will share tracking once it ships.`;

  return (
    <Modal title={`Order ${o.orderNumber}`} onClose={onClose} wide>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border p-4 flex flex-wrap gap-3 items-center justify-between">
            <div className="space-x-2">
              <Badge className={statusBadgeClass(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Badge>
              <Badge className="bg-stone-50 border-stone-200 text-stone-700">{PAYMENT_METHOD_LABEL[o.paymentMethod]} · {PAYMENT_STATUS_LABEL[o.paymentStatus]}</Badge>
            </div>
            <span className="text-stone-500">Placed {formatDateTime(o.createdAt)}</span>
          </div>

          {o.paymentStatus === 'AWAITING_VERIFICATION' && can('payments.verify') && (
            <div className="bg-purple-50 border border-purple-300 rounded-2xl p-4 space-y-2">
              <p className="font-bold text-purple-900">Verify UPI payment of {formatINR(o.total)}</p>
              <p>Check your bank / UPI app for UTR <span className="font-mono font-bold">{o.utrNumber}</span> and the exact amount before approving.</p>
              <div className="flex gap-2">
                <Button variant="success" loading={busy === 'verify'} onClick={() => verify(true)}>Payment received</Button>
                <Button variant="danger" loading={busy === 'verify'} onClick={() => verify(false)}>Not received — reject</Button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase font-bold text-stone-500">Customer</p>
              <p className="font-bold text-sm">{o.customer.name}</p>
              <p>{o.customer.phone}{o.customer.email ? ` · ${o.customer.email}` : ''}</p>
              <a href={formatWhatsAppUrl(o.customer.phone, customerMsg)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-emerald-700 font-bold">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp customer
              </a>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-stone-500">Ship to</p>
              <p>{o.customer.addressLine1}</p>
              {o.customer.addressLine2 && <p>{o.customer.addressLine2}</p>}
              <p>{o.customer.city}, {o.customer.state} — {o.customer.pincode}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-parchment-100 text-[10px] uppercase text-maroon-700">
                <tr><th className="p-2 text-left">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y">
                {o.items.map((i) => (
                  <tr key={i.sku + i.name}>
                    <td className="p-2">{i.name}<span className="block font-mono text-[10px] text-stone-400">{i.sku}</span></td>
                    <td className="p-2 text-right">{i.quantity}</td>
                    <td className="p-2 text-right">{formatINR(i.unitPrice)}</td>
                    <td className="p-2 text-right">{formatINR(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 space-y-1 border-t bg-parchment-50">
              <Row label="Subtotal" value={formatINR(o.subtotal)} />
              {o.discount > 0 && <Row label={`Coupon ${o.couponCode || ''}`} value={`−${formatINR(o.discount)}`} />}
              <Row label="Shipping" value={o.shippingFee ? formatINR(o.shippingFee) : 'Free'} />
              {o.codFee > 0 && <Row label="COD fee" value={formatINR(o.codFee)} />}
              <Row label={o.paymentMethod === 'COD' ? 'Total (collect in cash)' : 'Total'} value={formatINR(o.total)} bold />
              {o.razorpayPaymentId && <Row label="Razorpay payment" value={o.razorpayPaymentId} />}
              {o.utrNumber && <Row label="UPI UTR" value={o.utrNumber} />}
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-2xl border p-4 space-y-3">
            <p className="font-serif font-bold text-maroon-700 text-sm flex items-center gap-2"><Truck className="w-4 h-4" /> Shipping</p>
            {s.awbCode ? (
              <div className="grid grid-cols-2 gap-2">
                <Row label="Courier" value={s.courierName || '—'} />
                <Row label="AWB" value={s.awbCode} />
                <Row label="Via" value={s.provider === 'MANUAL' ? 'Booked manually' : s.provider === 'DELHIVERY' ? 'Delhivery (direct)' : 'Shiprocket'} />
                <Row label="Pickup" value={s.pickupScheduledFor || 'Not scheduled'} />
                <Row label="Courier status" value={s.shippingStatus || '—'} />
                <Row label="Last synced" value={formatDateTime(s.lastTrackingSync)} />
              </div>
            ) : s.srShipmentId ? (
              <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2">Created in Shiprocket (shipment {s.srShipmentId}) but no AWB yet. Press “Continue booking” to retry the remaining steps.</p>
            ) : (
              <p className="text-stone-500">Not shipped yet.</p>
            )}

            <div className="flex flex-wrap gap-2">
              {s.trackingUrl && <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-saffron-700 font-bold">Tracking page <ExternalLink className="w-3 h-3" /></a>}
              {canShip && (s.provider === 'SHIPROCKET' || s.provider === 'DELHIVERY') && s.awbCode && (
                <>
                  <Button variant="secondary" loading={busy === 'label'} onClick={() => (s.labelUrl ? window.open(s.labelUrl, '_blank', 'noopener') : shipping('label'))}>
                    <Printer className="w-3.5 h-3.5" /> Shipping label (PDF)
                  </Button>
                  {s.provider === 'SHIPROCKET' && <Button variant="ghost" loading={busy === 'invoice'} onClick={() => (s.invoiceUrl ? window.open(s.invoiceUrl, '_blank', 'noopener') : shipping('invoice'))}>Shiprocket invoice</Button>}
                  <Button variant="ghost" loading={busy === 'track'} onClick={() => shipping('track', {}, 'Tracking synced.')}>Sync tracking</Button>
                </>
              )}
              {canShip && (s.srOrderId || (s.provider === 'DELHIVERY' && s.awbCode)) && ['NEW', 'PROCESSING', 'PACKED', 'READY_TO_SHIP', 'PICKUP_SCHEDULED'].includes(o.status) && (
                <Button variant="danger" loading={busy === 'cancel'} onClick={() => confirm('Cancel this shipment with the courier? The order stays open so you can re-book.') && shipping('cancel', {}, 'Shipment cancelled with the courier.')}>
                  Cancel shipment
                </Button>
              )}
            </div>

            {canShip && canShipSr && !srDone && (
              <div className="border-t pt-3 space-y-2">
                <p className="font-bold">{s.srShipmentId ? 'Continue Shiprocket booking' : 'Book with Shiprocket'}</p>
                {!s.awbCode && (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      {(['weightKg', 'lengthCm', 'breadthCm', 'heightCm'] as const).map((k) => (
                        <Field key={k} label={k === 'weightKg' ? 'Weight kg' : k.replace('Cm', ' cm')}>
                          <Input type="number" step="0.01" min={0.01} value={pkg?.[k] ?? ''} placeholder="auto" disabled={Boolean(s.srShipmentId)}
                            onChange={(e) => setPkg({ ...(pkg || { weightKg: 0.5, lengthCm: 15, breadthCm: 12, heightCm: 10 }), [k]: Number(e.target.value) })} />
                        </Field>
                      ))}
                    </div>
                    <Button variant="ghost" loading={busy === 'rates'} onClick={loadRates}>Compare courier rates</Button>
                    {rates && (
                      <div className="max-h-48 overflow-y-auto border rounded-xl divide-y">
                        {rates.couriers.length === 0 && <p className="p-2 text-rose-700">No courier serves this pincode for this payment type.</p>}
                        {rates.couriers.map((c) => (
                          <label key={c.id} className={`flex items-center justify-between p-2 cursor-pointer ${courierId === c.id ? 'bg-saffron-50' : ''}`}>
                            <span className="flex items-center gap-2">
                              <input type="radio" name="courier" checked={courierId === c.id} onChange={() => setCourierId(c.id)} />
                              <span className="font-semibold">{c.name}</span>
                              {c.id === rates.recommendedId && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Recommended</Badge>}
                            </span>
                            <span>{formatINR(c.rate)} · {c.estimatedDays ? `${c.estimatedDays} days` : c.etd || ''}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <Button
                  loading={busy === 'ship'}
                  onClick={() => {
                    const chosen = rates?.couriers.find((c) => c.id === courierId);
                    shipping('ship', { courierId: chosen?.id, courierRate: chosen?.rate, package: s.srShipmentId ? undefined : pkg || undefined }, 'Shipment booked — AWB assigned and pickup scheduled.');
                  }}
                >
                  {s.srShipmentId ? 'Continue booking' : courierId ? 'Book selected courier' : 'Book (Shiprocket picks courier)'}
                </Button>
                <p className="text-[10px] text-stone-500">Creates the order in Shiprocket, assigns the AWB, schedules pickup and fetches the label. If any step fails you will see the exact Shiprocket error and can retry — nothing is faked.</p>
              </div>
            )}
            {canShip && canShipDl && (
              <div className="border-t pt-3 space-y-2">
                <p className="font-bold">{s.awbCode ? 'Continue Delhivery booking' : 'Book directly with Delhivery'}</p>
                {!s.awbCode && (
                  <>
                    <Button variant="ghost" loading={busy === 'dl_quote'} onClick={() => run('dl_quote', async () => {
                      const q = await adminFetch<{ serviceable: boolean; cod: boolean; rate: number | null }>(`/api/admin/orders/${o.id}/shipping`, { method: 'POST', json: { action: 'dl_quote', weightKg: pkg?.weightKg } });
                      setDlQuote(q);
                      return q;
                    })}>Check Delhivery serviceability & rate</Button>
                    {dlQuote && (
                      <p className={dlQuote.serviceable ? 'text-emerald-700' : 'text-rose-700'}>
                        {dlQuote.serviceable ? `Delhivery delivers here${o.paymentMethod === 'COD' ? ' with COD' : ''}.` : `Delhivery does not serve this pincode${o.paymentMethod === 'COD' ? ' for COD' : ''}.`}
                        {dlQuote.rate !== null && ` Estimated charge ${formatINR(dlQuote.rate)}.`}
                      </p>
                    )}
                  </>
                )}
                <Button variant="secondary" loading={busy === 'dl_ship'} onClick={() => shipping('dl_ship', { courierRate: dlQuote?.rate ?? undefined, package: s.awbCode ? undefined : pkg || undefined }, 'Booked with Delhivery — waybill assigned and pickup requested.')}>
                  {s.awbCode ? 'Request pickup / label' : 'Book with Delhivery'}
                </Button>
                <p className="text-[10px] text-stone-500">Uses your own Delhivery account and warehouse. Delhivery assigns the waybill; errors are shown exactly as Delhivery returns them.</p>
              </div>
            )}
            {canShip && !status?.integrations.shiprocket && !dlConnected && !s.awbCode && (
              <p className="text-[11px] text-amber-800">No courier is connected yet (Super Admin → Integrations). You can still record a manually booked shipment below.</p>
            )}
            {isPrepaidUnpaid && o.status !== 'CANCELLED' && <p className="text-[11px] text-purple-800">Shipping is locked until the payment is confirmed.</p>}

            {canShip && !s.awbCode && !s.srShipmentId && !isPrepaidUnpaid && !['CANCELLED', 'REFUNDED', 'PENDING_PAYMENT'].includes(o.status) && (
              <details className="border-t pt-3">
                <summary className="cursor-pointer font-bold">Shipped with another courier? Record it manually</summary>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                  <Input placeholder="Courier name" value={manual.courierName} onChange={(e) => setManual({ ...manual, courierName: e.target.value })} />
                  <Input placeholder="AWB / tracking no." value={manual.awbCode} onChange={(e) => setManual({ ...manual, awbCode: e.target.value })} />
                  <Input placeholder="Tracking URL (optional)" value={manual.trackingUrl} onChange={(e) => setManual({ ...manual, trackingUrl: e.target.value })} />
                </div>
                <Button className="mt-2" variant="secondary" loading={busy === 'meta'} onClick={() => saveMeta({ manualShipment: manual }, 'Manual shipment saved.')}>Save shipment</Button>
              </details>
            )}
          </div>
        </div>

        {/* Right: actions & history */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border p-4 space-y-2">
            <p className="font-bold text-maroon-700">Update status</p>
            {next.length === 0 ? (
              <p className="text-stone-500">{can('orders.status') ? 'This order is closed.' : 'Your role can view this order but not change its status.'}</p>
            ) : (
              <>
                <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as OrderStatus)}>
                  <option value="">Choose new status…</option>
                  {next.map((st) => <option key={st} value={st}>{ORDER_STATUS_LABEL[st]}</option>)}
                </Select>
                <Textarea rows={2} placeholder={nextStatus === 'CANCELLED' ? 'Cancellation reason' : nextStatus === 'REFUNDED' ? 'Refund details (amount, reference)' : 'Note (optional)'}
                  value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
                <Button disabled={!nextStatus} loading={busy === 'status'} onClick={() => changeStatus()}>Update</Button>
                {next.includes('CANCELLED') && (
                  <Button variant="danger" className="w-full" loading={busy === 'status'} onClick={() => changeStatus('CANCELLED')}>
                    {o.paymentStatus === 'PAID' && refundable > 0
                      ? o.paymentMethod === 'RAZORPAY' && o.razorpayPaymentId ? `Cancel order & refund ${formatINR(refundable)} (Razorpay)` : 'Cancel order (refund due — pay back manually)'
                      : 'Cancel order'}
                  </Button>
                )}

              </>
            )}
          </div>

          {(o.returnRequests?.length ?? 0) > 0 && (
            <div className="bg-white rounded-2xl border border-sky-300 p-4 space-y-3">
              <p className="font-bold text-maroon-700">Return requests</p>
              {o.returnRequests!.map((r) => (
                <div key={r.id} className="text-xs space-y-1 border-t first:border-t-0 pt-2 first:pt-0">
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-500">{formatDateTime(r.createdAt)}</span>
                    <Badge className={r.status === 'OPEN' ? 'bg-sky-100 text-sky-800' : r.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}>{r.status}</Badge>
                  </div>
                  <p><strong>Reason:</strong> {r.reason}</p>
                  {r.refundUpi && <p><strong>Refund UPI:</strong> <span className="font-mono">{r.refundUpi}</span></p>}
                  {r.adminNote && <p className="text-stone-600"><strong>Note:</strong> {r.adminNote}{r.resolvedBy ? ` — ${r.resolvedBy}` : ''}</p>}
                  {can('orders.status') && (r.status === 'OPEN' || r.status === 'APPROVED') && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {r.status === 'OPEN' && <Button loading={busy === `ret-${r.id}`} onClick={() => decideReturn(r.id, 'APPROVED')}>Approve</Button>}
                      <Button variant="secondary" loading={busy === `ret-${r.id}`} onClick={() => decideReturn(r.id, 'COMPLETED')}>Mark completed</Button>
                      {r.status === 'OPEN' && <Button variant="danger" loading={busy === `ret-${r.id}`} onClick={() => decideReturn(r.id, 'REJECTED')}>Reject</Button>}
                    </div>
                  )}
                </div>
              ))}
              <p className="text-[10px] text-stone-500">Approve, arrange the pickup (or ask the customer to ship it back), then issue the refund in the Refund panel. A full refund closes the request automatically.</p>
            </div>
          )}

          {can('payments.refund') && (o.paymentStatus === 'PAID' || (o.refundAmount ?? 0) > 0) && (
            <div className="bg-white rounded-2xl border p-4 space-y-2">
              <p className="font-bold text-maroon-700">Refund</p>
              {o.refundDue > 0 && (
                <p className="text-xs bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-2">
                  This order is {ORDER_STATUS_LABEL[o.status].toLowerCase()} but {formatINR(o.refundDue)} has not been refunded yet.
                  {o.refundNotes ? ` ${o.refundNotes}` : ''}
                </p>
              )}
              {(o.refundAmount ?? 0) > 0 && (
                <p className="text-xs">Refunded so far: <strong>{formatINR(o.refundAmount ?? 0)}</strong>{o.razorpayRefundId ? ` (Razorpay ${o.razorpayRefundId})` : ''}</p>
              )}
              {o.paymentStatus === 'PAID' && refundable > 0 ? (
                <>
                  <Field label={`Amount ₹ (up to ${formatINR(refundable)})`}>
                    <Input type="number" min={1} max={refundable} value={refund.amount} placeholder={String(refundable)} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} />
                  </Field>
                  <Textarea rows={2} placeholder={o.paymentMethod === 'RAZORPAY' ? 'Reason (optional)' : 'How you paid it back, e.g. UPI ref 4312… (required)'} value={refund.note} onChange={(e) => setRefund({ ...refund, note: e.target.value })} />
                  <Button variant="danger" loading={busy === 'refund'} onClick={() => {
                    const amount = Number(refund.amount || refundable);
                    const method = o.paymentMethod === 'RAZORPAY' && o.razorpayPaymentId ? 'razorpay' : 'manual';
                    if (!confirm(method === 'razorpay' ? `Refund ${formatINR(amount)} to the customer through Razorpay now?` : `Record a manual refund of ${formatINR(amount)}?`)) return;
                    run('refund', async () => {
                      const res = await adminFetch<{ order: AdminOrder }>(`/api/admin/orders/${o.id}/refund`, { method: 'POST', json: { amount, note: refund.note, method } });
                      apply(res.order);
                      setRefund({ amount: '', note: '' });
                      return res;
                    }, method === 'razorpay' ? 'Refund sent through Razorpay.' : 'Refund recorded.');
                  }}>
                    {o.paymentMethod === 'RAZORPAY' && o.razorpayPaymentId ? 'Refund via Razorpay' : 'Record manual refund'}
                  </Button>
                  <p className="text-[10px] text-stone-500">
                    {o.paymentMethod === 'RAZORPAY' ? 'The money is returned automatically to the customer’s card/UPI (5–7 working days).' : 'Pay the customer back by UPI/bank yourself, then record it here.'} Full refunds of delivered/returned orders mark the order Refunded.
                  </p>
                </>
              ) : (
                <p className="text-xs text-stone-500">Fully refunded.</p>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border p-4 space-y-2">
            <Button variant="secondary" className="w-full" onClick={() => setPrinting(true)}><Printer className="w-3.5 h-3.5" /> Print invoice / packing slip</Button>
          </div>

          {can('orders.notes') && <div className="bg-white rounded-2xl border p-4 space-y-2">
            <Field label="Internal notes (not visible to customer)"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            <Field label="Actual courier cost ₹ (for profit report)"><Input type="number" min={0} value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} /></Field>
            <Button variant="ghost" loading={busy === 'meta'} onClick={() => saveMeta({ adminNotes: notes, shippingCost: shippingCost === '' ? null : Number(shippingCost) }, 'Notes saved.')}>Save notes</Button>
          </div>}

          <div className="bg-white rounded-2xl border p-4">
            <p className="font-bold text-maroon-700 mb-2">History</p>
            <ol className="space-y-2 max-h-80 overflow-y-auto">
              {(o.events || []).map((e) => (
                <li key={e.id} className={`border-l-2 pl-2 ${e.kind === 'WARNING' ? 'border-rose-500 text-rose-800' : 'border-gold-400'}`}>
                  <p>{e.message}</p>
                  <p className="text-[10px] text-stone-400">{formatDateTime(e.createdAt)} · {e.actor}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
      {printing && <PrintInvoiceModal order={o} onClose={() => setPrinting(false)} />}
    </Modal>
  );
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? 'font-bold text-maroon-700 text-sm' : ''}`}>
      <span className="text-stone-500">{label}</span>
      <span className="text-right break-all">{value}</span>
    </div>
  );
}
