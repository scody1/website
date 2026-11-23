import { db, num } from './db';
import { ApiError } from './http';
import { getSettingsSection } from './settings';
import { getDelhiveryCredentials } from './integrations';
import type { OrderStatus } from '../shared/types';

// Delhivery B2C (Express) API client — direct integration with the store's own
// Delhivery account. Token: Delhivery One panel → Settings → API Setup.
// Staging and production use different hosts and tokens.

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export class DelhiveryError extends ApiError {
  constructor(message: string, status = 502, details?: unknown) {
    super(status, `Delhivery: ${message}`, details);
  }
}

async function base(): Promise<{ url: string; token: string }> {
  const creds = await getDelhiveryCredentials();
  if (!creds) throw new DelhiveryError('not connected yet. A Super Admin must connect it in Admin → Integrations.', 503);
  const url = process.env.DELHIVERY_API_BASE
    || (creds.environment === 'staging' ? 'https://staging-express.delhivery.com' : 'https://track.delhivery.com');
  return { url: url.replace(/\/$/, ''), token: creds.token };
}

export async function delhiveryConfigured(): Promise<boolean> {
  try {
    return Boolean(await getDelhiveryCredentials());
  } catch {
    return false;
  }
}

async function dlFetch<T>(path: string, init: RequestInit & { override?: { url: string; token: string } } = {}): Promise<T> {
  const { override, ...rest } = init;
  const { url, token } = override || (await base());
  let res: Response;
  try {
    res = await fetch(`${url}${path}`, {
      ...rest,
      headers: { Accept: 'application/json', Authorization: `Token ${token}`, ...(rest.headers || {}) },
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store'
    });
  } catch (err) {
    throw new DelhiveryError(`request to ${path} failed (${(err as Error).message}).`);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 300) };
  }
  if (res.status === 401 || res.status === 403) throw new DelhiveryError('the API token was rejected. Check it in Admin → Integrations.', 400);
  if (!res.ok) {
    const d = data as { error?: string; detail?: string; rmk?: string; raw?: string } | null;
    throw new DelhiveryError(d?.error || d?.detail || d?.rmk || d?.raw || `HTTP ${res.status}`, res.status >= 500 ? 502 : 400, data);
  }
  return data as T;
}

// ---------------------------------------------------------------- endpoints

export interface DlPincode { serviceable: boolean; cod: boolean; prepaid: boolean; city: string; state: string }

export async function delhiveryPincode(pin: string, override?: { url: string; token: string }): Promise<DlPincode> {
  const data = await dlFetch<{ delivery_codes?: { postal_code?: Row }[] }>(`/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pin)}`, { override });
  const pc = data?.delivery_codes?.[0]?.postal_code;
  if (!pc) return { serviceable: false, cod: false, prepaid: false, city: '', state: '' };
  const yes = (v: unknown) => String(v).toUpperCase() === 'Y';
  return { serviceable: yes(pc.pre_paid) || yes(pc.cod), cod: yes(pc.cod), prepaid: yes(pc.pre_paid), city: pc.city || pc.district || '', state: pc.state_code || '' };
}

/** Checks a token before it is saved. */
export async function verifyDelhiveryToken(token: string, environment: 'production' | 'staging', testPincode: string) {
  const url = process.env.DELHIVERY_API_BASE || (environment === 'staging' ? 'https://staging-express.delhivery.com' : 'https://track.delhivery.com');
  await delhiveryPincode(testPincode || '110001', { url: url.replace(/\/$/, ''), token });
}

export async function delhiveryRate(p: { originPin: string; destPin: string; grams: number; cod: boolean; codAmount: number }): Promise<number | null> {
  try {
    const qs = new URLSearchParams({ md: 'S', ss: 'Delivered', d_pin: p.destPin, o_pin: p.originPin, cgm: String(p.grams), pt: p.cod ? 'COD' : 'Pre-paid', cod: String(p.cod ? p.codAmount : 0) });
    const data = await dlFetch<{ total_amount?: number }[] | { total_amount?: number }>(`/api/kinko/v1/invoice/charges/.json?${qs}`);
    const first = Array.isArray(data) ? data[0] : data;
    const amt = Number(first?.total_amount);
    return Number.isFinite(amt) ? Math.round(amt) : null;
  } catch {
    return null; // rate is informational only
  }
}

interface CreateResp {
  success?: boolean;
  rmk?: string;
  packages?: { status?: string; waybill?: string; refnum?: string; remarks?: string[] | string; serviceable?: boolean }[];
}

export function mapDelhiveryStatus(status: string, statusType: string): OrderStatus | null {
  const s = status.toUpperCase();
  const t = statusType.toUpperCase();
  if (t === 'RT' || s.includes('RTO') || s.includes('RETURN')) return 'RTO';
  if (t === 'DL' || s === 'DELIVERED') return 'DELIVERED';
  if (s.includes('DISPATCHED') || s.includes('OUT FOR DELIVERY')) return 'OUT_FOR_DELIVERY';
  if (s.includes('IN TRANSIT') || s === 'PENDING' || s.includes('REACHED')) return 'IN_TRANSIT';
  if (s.includes('PICKED UP')) return 'SHIPPED';
  return null; // Manifested / Not Picked / Lost etc. are recorded but do not change the order status
}

// ---------------------------------------------------------------- order operations (called from shipping.ts)

export interface DelhiveryBookingInput {
  order: Row;
  items: Row[];
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}

/** Creates the shipment (Delhivery assigns the waybill) and returns it. Never invents a waybill. */
export async function createDelhiveryShipment(input: DelhiveryBookingInput): Promise<string> {
  const business = await getSettingsSection('business');
  if (!business.delhiveryPickupName) {
    throw new ApiError(400, 'Set the Delhivery warehouse name in "Shipping Setup" first (it must match the warehouse registered with Delhivery).');
  }
  const o = input.order;
  const sellerAddress = [business.shopHouseNo, business.street, business.landmark].filter(Boolean).join(', ');
  const shipment = {
    name: o.customer_name,
    add: [o.address_line1, o.address_line2].filter(Boolean).join(', '),
    pin: o.pincode,
    city: o.city,
    state: o.state,
    country: 'India',
    phone: o.customer_phone,
    order: o.order_number,
    payment_mode: o.payment_method === 'COD' ? 'COD' : 'Prepaid',
    cod_amount: o.payment_method === 'COD' ? String(o.total) : '0',
    total_amount: String(o.total),
    order_date: new Date(o.created_at).toISOString(),
    products_desc: input.items.map((i) => `${i.name} x${i.quantity}`).join(', ').slice(0, 250),
    hsn_code: input.items.map((i) => i.hsn_code).filter(Boolean).join(','),
    quantity: String(input.items.reduce((s, i) => s + i.quantity, 0)),
    weight: String(Math.round(input.weightKg * 1000)), // grams
    shipment_length: String(input.lengthCm),
    shipment_width: String(input.breadthCm),
    shipment_height: String(input.heightCm),
    seller_name: business.businessLegalName,
    seller_add: sellerAddress,
    seller_inv: o.order_number,
    seller_gst_tin: business.billingType === 'GST' ? business.gstin : '',
    return_name: business.businessLegalName,
    return_add: sellerAddress,
    return_city: business.city,
    return_state: business.state,
    return_pin: business.pincode,
    return_country: 'India',
    return_phone: business.phone,
    shipping_mode: 'Surface',
    address_type: 'home',
    waybill: ''
  };
  const body = new URLSearchParams({ format: 'json', data: JSON.stringify({ shipments: [shipment], pickup_location: { name: business.delhiveryPickupName } }) });
  const res = await dlFetch<CreateResp>('/api/cmu/create.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  const pkg = res?.packages?.[0];
  if (!pkg || String(pkg.status).toLowerCase() !== 'success' || !pkg.waybill) {
    const remarks = Array.isArray(pkg?.remarks) ? pkg?.remarks.join('; ') : pkg?.remarks;
    throw new DelhiveryError(remarks || res?.rmk || 'shipment was not created (check the warehouse name, pincode serviceability and wallet balance)', 400, res);
  }
  return pkg.waybill;
}

/** Requests a pickup at the registered warehouse for the next working slot. */
export async function requestDelhiveryPickup(packageCount: number): Promise<string> {
  const business = await getSettingsSection('business');
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // IST
  const date = new Date(now);
  if (now.getUTCHours() >= 14) date.setUTCDate(date.getUTCDate() + 1); // after 2 pm → tomorrow
  if (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1); // skip Sunday
  const pickupDate = date.toISOString().slice(0, 10);
  try {
    const res = await dlFetch<{ pickup_id?: number | string; error?: unknown }>('/fm/request/new/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickup_time: '11:00:00', pickup_date: pickupDate, pickup_location: business.delhiveryPickupName, expected_package_count: packageCount })
    });
    return `${pickupDate} (request ${res?.pickup_id ?? 'created'})`;
  } catch (err) {
    if (/already|exist/i.test((err as Error).message)) return `${pickupDate} (pickup already requested)`;
    throw err;
  }
}

export async function delhiveryLabel(waybill: string): Promise<string> {
  const res = await dlFetch<{ packages?: { pdf_download_link?: string }[] }>(`/api/p/packing_slip?wbns=${encodeURIComponent(waybill)}&pdf=true`);
  const link = res?.packages?.[0]?.pdf_download_link;
  if (!link) throw new DelhiveryError('label is not ready yet — try again in a minute.', 400);
  return link;
}

export async function delhiveryTrack(waybill: string): Promise<{
  status: string; statusType: string; when: string | null; etd: string | null;
  activities: { date: string; activity: string; location: string }[];
} | null> {
  const res = await dlFetch<{ ShipmentData?: { Shipment?: Row }[] }>(`/api/v1/packages/json/?waybill=${encodeURIComponent(waybill)}`);
  const sh = res?.ShipmentData?.[0]?.Shipment;
  const st = sh?.Status;
  if (!st?.Status) return null;
  const scans = (Array.isArray(sh?.Scans) ? sh!.Scans : []) as { ScanDetail?: Row }[];
  const activities = scans
    .map((x) => x.ScanDetail || {})
    .map((d) => ({ date: String(d.ScanDateTime || d.StatusDateTime || ''), activity: String(d.Instructions || d.Scan || ''), location: String(d.ScannedLocation || '') }))
    .filter((a) => a.activity)
    .reverse()
    .slice(0, 40);
  return {
    status: st.Status, statusType: st.StatusType || '', when: st.StatusDateTime || null,
    etd: sh?.ExpectedDeliveryDate || sh?.PromisedDeliveryDate || null, activities
  };
}

export async function delhiveryCancel(waybill: string): Promise<void> {
  const res = await dlFetch<{ status?: boolean; remark?: string }>('/api/p/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ waybill, cancellation: 'true' })
  });
  if (res && res.status === false) throw new DelhiveryError(res.remark || 'cancellation was refused', 400, res);
}

/** Shipping-cost estimate for the order page. */
export async function delhiveryQuote(order: Row, weightKg: number) {
  const business = await getSettingsSection('business');
  const pin = await delhiveryPincode(order.pincode);
  const rate = business.pincode
    ? await delhiveryRate({ originPin: business.pincode, destPin: order.pincode, grams: Math.round(weightKg * 1000), cod: order.payment_method === 'COD', codAmount: order.total })
    : null;
  return { serviceable: order.payment_method === 'COD' ? pin.cod : pin.prepaid, cod: pin.cod, rate };
}

export async function delhiveryActiveOrders(limit: number) {
  return db()<{ id: string }[]>`
    SELECT id FROM orders WHERE courier_provider = 'DELHIVERY' AND awb_code IS NOT NULL
      AND status IN ('READY_TO_SHIP','PICKUP_SCHEDULED','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY')
    ORDER BY last_tracking_sync NULLS FIRST LIMIT ${limit}
  `;
}

export const gramsOf = (kg: unknown) => Math.round(num(kg) * 1000);
