import crypto from 'crypto';
import { ApiError } from './http';
import { getRazorpayCredentials } from './integrations';

const API = () => (process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com').replace(/\/$/, '');

export async function razorpayConfigured(): Promise<boolean> {
  try {
    return Boolean(await getRazorpayCredentials());
  } catch {
    return false;
  }
}

export async function razorpayKeyId(): Promise<string> {
  return (await getRazorpayCredentials())?.keyId || '';
}

async function rzpFetch<T>(path: string, init: RequestInit = {}, override?: { keyId: string; keySecret: string }): Promise<T> {
  const creds = override || (await getRazorpayCredentials());
  if (!creds) throw new ApiError(503, 'Razorpay is not connected. A Super Admin must connect it in Admin → Integrations.');
  const authHeader = () => `Basic ${Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64')}`;
  let res: Response;
  try {
    res = await fetch(`${API()}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: authHeader(), ...(init.headers || {}) },
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store'
    });
  } catch (err) {
    throw new ApiError(502, `Could not reach Razorpay: ${(err as Error).message}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { description?: string } })?.error?.description || `Razorpay error ${res.status}`;
    throw new ApiError(502, `Razorpay: ${msg}`);
  }
  return data as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

/** Creates a Razorpay order. `amountRupees` is converted to paise. */
export function createRazorpayOrder(amountRupees: number, receipt: string, notes: Record<string, string>) {
  return rzpFetch<RazorpayOrder>('/v1/orders', {
    method: 'POST',
    body: JSON.stringify({ amount: amountRupees * 100, currency: 'INR', receipt, notes, payment_capture: 1 })
  });
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  /** paise already refunded */
  amount_refunded?: number;
  method?: string;
}

export function fetchRazorpayPayment(paymentId: string) {
  return rzpFetch<RazorpayPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`);
}

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Refunds (part of) a captured payment. `amountRupees` is converted to paise. */
export function refundRazorpayPayment(paymentId: string, amountRupees: number, notes: Record<string, string>) {
  return rzpFetch<{ id: string; amount: number; status: string }>(`/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST',
    body: JSON.stringify({ amount: amountRupees * 100, speed: 'normal', notes })
  });
}

/** Checks a key pair before it is saved (lists at most one order). */
export async function verifyRazorpayKeys(keyId: string, keySecret: string): Promise<void> {
  await rzpFetch('/v1/orders?count=1', {}, { keyId, keySecret });
}

/** Verifies the signature returned by Razorpay Checkout after a payment. */
export async function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  const creds = await getRazorpayCredentials();
  if (!creds) return false;
  const expected = crypto
    .createHmac('sha256', creds.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return safeEqualHex(expected, signature);
}

/** Verifies a Razorpay webhook (X-Razorpay-Signature over the raw body). */
export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const secret = (await getRazorpayCredentials())?.webhookSecret;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}
