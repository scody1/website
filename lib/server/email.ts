import { db } from './db';
import { getAllSettings } from './settings';
import { getEmailCredentials } from './integrations';
import { ORDER_STATUS_LABEL } from '../shared/orderStatus';
import type { OrderStatus } from '../shared/types';

// Transactional e-mail via Resend (https://resend.com — free tier 3,000 mails/month).
// Every function here is best-effort: it never throws, so an e-mail problem can
// never break checkout or shipping. Each mail is sent at most once per order.

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export async function emailConfigured(): Promise<boolean> {
  try {
    return Boolean(await getEmailCredentials());
  } catch {
    return false;
  }
}

async function send(to: string, subject: string, html: string, override?: { apiKey: string; fromEmail: string }): Promise<void> {
  const creds = override || (await getEmailCredentials());
  if (!creds) throw new Error('E-mail is not connected.');
  const base = (process.env.EMAIL_API_BASE || 'https://api.resend.com').replace(/\/$/, '');
  const res = await fetch(`${base}/emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creds.apiKey}` },
    body: JSON.stringify({ from: creds.fromEmail, to: [to], subject, html }),
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store'
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || `E-mail provider error ${res.status}`);
  }
}

/** Sends a test mail when a Super Admin connects e-mail (throws with the provider's message). */
export async function sendTestEmail(apiKey: string, fromEmail: string, to: string) {
  await send(to, 'Test e-mail from your store', '<p>Your store can now send order e-mails. 🙏</p>', { apiKey, fromEmail });
}

function layout(storeName: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#FDF8F0;font-family:Arial,Helvetica,sans-serif;color:#23120B">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#6E1414;color:#F7EFE1;padding:16px 20px;border-radius:14px 14px 0 0;font-size:18px;font-weight:bold">${esc(storeName)}</div>
    <div style="background:#fff;border:1px solid #e7d6b8;border-top:0;padding:20px;border-radius:0 0 14px 14px;font-size:14px;line-height:1.5">${body}</div>
    <p style="font-size:11px;color:#8a7a70;text-align:center;margin-top:16px">This is an automatic message about your order.</p>
  </div></body></html>`;
}

function itemsTable(items: Row[]) {
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px">${items
    .map((i) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${esc(i.name)} × ${i.quantity}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${inr(i.line_total)}</td></tr>`)
    .join('')}</table>`;
}

async function load(orderId: string) {
  const sql = db();
  const [o] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  if (!o) return null;
  const items = await sql`SELECT name, quantity, line_total FROM order_items WHERE order_id = ${orderId}`;
  const settings = await getAllSettings();
  return { o, items, settings };
}

async function note(orderId: string, kind: 'NOTE' | 'WARNING', message: string) {
  await db()`INSERT INTO order_events (order_id, kind, message, actor) VALUES (${orderId}, ${kind}, ${message}, 'system')`.catch(() => undefined);
}

/** Order confirmation to the customer + new-order alert to the admin. */
export async function sendNewOrderEmails(orderId: string): Promise<void> {
  try {
    const creds = await getEmailCredentials();
    if (!creds) return;
    const data = await load(orderId);
    if (!data) return;
    const { o, items, settings } = data;
    const store = settings.store.storeName;
    const site = (process.env.SITE_URL || '').replace(/\/$/, '');
    const pay = o.payment_method === 'COD' ? `Cash on Delivery — please keep ${inr(o.total)} ready` : o.payment_method === 'UPI' ? 'UPI — we will confirm your payment shortly' : 'Paid online';

    if (o.customer_email && !o.confirmation_email_at) {
      try {
        await send(
          o.customer_email,
          `Order ${o.order_number} confirmed — ${store}`,
          layout(store, `<p>Namaste ${esc(String(o.customer_name).split(' ')[0])} 🙏</p>
            <p>Thank you for your order <strong>#${esc(o.order_number)}</strong>. We are preparing it for dispatch.</p>
            ${itemsTable(items)}
            <p style="text-align:right"><strong>Total: ${inr(o.total)}</strong><br><span style="color:#5F463B">${esc(pay)}</span></p>
            <p><strong>Delivering to:</strong><br>${esc(o.address_line1)}${o.address_line2 ? `, ${esc(o.address_line2)}` : ''}<br>${esc(o.city)}, ${esc(o.state)} — ${esc(o.pincode)}</p>
            <p>You will get another e-mail with the tracking link when it ships.${site ? ` You can also track it any time at <a href="${site}/#order-tracking-section">${esc(site)}</a> with your order number and mobile number.` : ''}</p>`)
        );
        await db()`UPDATE orders SET confirmation_email_at = now() WHERE id = ${orderId}`;
        await note(orderId, 'NOTE', `Confirmation e-mail sent to ${o.customer_email}.`);
      } catch (err) {
        await note(orderId, 'WARNING', `Confirmation e-mail failed: ${(err as Error).message}`);
      }
    }

    if (creds.adminEmail && !o.admin_alert_at) {
      try {
        await send(
          creds.adminEmail,
          `🛒 New order ${o.order_number} — ${inr(o.total)} (${o.payment_method})`,
          layout(store, `<p><strong>New order #${esc(o.order_number)}</strong></p>
            <p>${esc(o.customer_name)} · ${esc(o.customer_phone)}<br>${esc(o.city)}, ${esc(o.state)} — ${esc(o.pincode)}</p>
            ${itemsTable(items)}
            <p style="text-align:right"><strong>${inr(o.total)} · ${esc(o.payment_method)}</strong></p>
            ${site ? `<p><a href="${site}/admin">Open the admin panel</a></p>` : ''}`)
        );
        await db()`UPDATE orders SET admin_alert_at = now() WHERE id = ${orderId}`;
      } catch (err) {
        await note(orderId, 'WARNING', `Admin alert e-mail failed: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    console.warn('[email] new order emails failed', err);
  }
}

/** "Your order has shipped" with the courier tracking link. */
export async function sendShippedEmail(orderId: string): Promise<void> {
  try {
    if (!(await emailConfigured())) return;
    const data = await load(orderId);
    if (!data) return;
    const { o, settings } = data;
    if (!o.customer_email || !o.awb_code || o.shipped_email_at) return;
    const store = settings.store.storeName;
    try {
      await send(
        o.customer_email,
        `Your order ${o.order_number} has shipped 🚚 — ${store}`,
        layout(store, `<p>Namaste ${esc(String(o.customer_name).split(' ')[0])} 🙏</p>
          <p>Your order <strong>#${esc(o.order_number)}</strong> is on its way with <strong>${esc(o.courier_name || 'our courier partner')}</strong>.</p>
          <p>Tracking number (AWB): <strong>${esc(o.awb_code)}</strong></p>
          ${o.tracking_url ? `<p><a href="${esc(o.tracking_url)}" style="display:inline-block;background:#E66A1F;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Track your parcel</a></p>` : ''}
          ${o.payment_method === 'COD' ? `<p>Please keep <strong>${inr(o.total)}</strong> ready for the courier.</p>` : ''}`)
      );
      await db()`UPDATE orders SET shipped_email_at = now() WHERE id = ${orderId}`;
      await note(orderId, 'NOTE', `Shipping e-mail with tracking link sent to ${o.customer_email}.`);
    } catch (err) {
      await note(orderId, 'WARNING', `Shipping e-mail failed: ${(err as Error).message}`);
    }
  } catch (err) {
    console.warn('[email] shipped email failed', err);
  }
}

/** Optional short status mail (delivered / cancelled / refunded). */
export async function sendStatusEmail(orderId: string, status: OrderStatus, note2 = ''): Promise<void> {
  if (!['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(status)) return;
  try {
    if (!(await emailConfigured())) return;
    const data = await load(orderId);
    if (!data?.o.customer_email) return;
    const { o, settings } = data;
    const store = settings.store.storeName;
    const msg = status === 'DELIVERED'
      ? 'Your order has been delivered. We hope it brings blessings to your home. We would be grateful for a review!'
      : status === 'CANCELLED'
        ? `Your order has been cancelled.${o.payment_status === 'PAID' || o.payment_status === 'REFUNDED' ? ' Any amount paid will be refunded to the original payment method.' : ''}`
        : `Your refund${o.refund_amount ? ` of ${inr(o.refund_amount)}` : ''} has been processed. Banks usually take 5–7 working days to show it.`;
    await send(
      o.customer_email,
      `Order ${o.order_number}: ${ORDER_STATUS_LABEL[status]} — ${store}`,
      layout(store, `<p>Namaste ${esc(String(o.customer_name).split(' ')[0])} 🙏</p><p>${esc(msg)}</p>${note2 ? `<p style="color:#5F463B">${esc(note2)}</p>` : ''}<p>Order #${esc(o.order_number)}</p>`)
    );
    await note(orderId, 'NOTE', `"${ORDER_STATUS_LABEL[status]}" e-mail sent to ${o.customer_email}.`);
  } catch (err) {
    await note(orderId, 'WARNING', `Status e-mail failed: ${(err as Error).message}`);
  }
}
