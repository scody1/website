import { NextRequest, NextResponse } from 'next/server';
import { audit, requireAdmin } from '@/lib/server/auth';
import { route } from '@/lib/server/http';
import { listOrdersForExport } from '@/lib/server/orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** RFC 4180 CSV cell, with protection against spreadsheet formula injection. */
function cell(v: unknown): string {
  let s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const GET = route(async (req: NextRequest) => {
  const kind = req.nextUrl.searchParams.get('kind') === 'customers' ? 'customers' : 'orders';
  const user = await requireAdmin(req, kind === 'customers' ? 'customers.export' : 'orders.export');
  await audit(user, 'export.csv', kind, req);
  const data = await listOrdersForExport();
  let lines: string[];

  if (kind === 'customers') {
    const map = new Map<string, { name: string; phone: string; email: string; city: string; state: string; orders: number; spent: number }>();
    for (const { row: o } of data) {
      if (['CANCELLED', 'PENDING_PAYMENT'].includes(o.status)) continue;
      const c = map.get(o.customer_phone) || { name: o.customer_name, phone: o.customer_phone, email: o.customer_email, city: o.city, state: o.state, orders: 0, spent: 0 };
      c.orders += 1;
      if (o.status !== 'REFUNDED') c.spent += o.total;
      map.set(o.customer_phone, c);
    }
    lines = [
      ['Name', 'Phone', 'Email', 'City', 'State', 'Orders', 'Total Spent'].map(cell).join(','),
      ...Array.from(map.values()).map((c) => [c.name, c.phone, c.email, c.city, c.state, c.orders, c.spent].map(cell).join(','))
    ];
  } else {
    const header = ['Order Number', 'Date', 'Customer', 'Phone', 'Email', 'Address', 'City', 'State', 'Pincode', 'Items',
      'Subtotal', 'Discount', 'Coupon', 'Shipping', 'COD Fee', 'Total', 'Payment Method', 'Payment Status', 'UTR',
      'Razorpay Payment', 'Order Status', 'Courier', 'AWB', 'Shipping Cost'];
    lines = [header.map(cell).join(',')];
    for (const { row: o, items } of data) {
      lines.push([
        o.order_number, o.created_at, o.customer_name, o.customer_phone, o.customer_email,
        [o.address_line1, o.address_line2].filter(Boolean).join(', '), o.city, o.state, o.pincode,
        items.map((i) => `${i.name} x${i.quantity}`).join('; '),
        o.subtotal, o.discount, o.coupon_code, o.shipping_fee, o.cod_fee, o.total, o.payment_method, o.payment_status,
        o.utr_number, o.razorpay_payment_id, o.status, o.courier_name, o.awb_code, o.shipping_cost
      ].map(cell).join(','));
    }
  }

  return new NextResponse('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store'
    }
  });
});
