import { ApiError } from './http';
import { getPrivateValue, setPrivateValue } from './settings';
import { getShiprocketCredentials } from './integrations';

// Shiprocket REST API client (https://apidocs.shiprocket.in).
// Credentials: a Shiprocket "API user" (Settings → API → API Users), entered once by a
// Super Admin in Admin → Integrations (stored encrypted) or set via environment variables.

const BASE = () => (process.env.SHIPROCKET_API_BASE || 'https://apiv2.shiprocket.in/v1/external').replace(/\/$/, '');
const TOKEN_KEY = 'shiprocket_token';
// Shiprocket tokens are valid for 240 hours; refresh well before that.
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;

export async function shiprocketConfigured(): Promise<boolean> {
  try {
    return Boolean(await getShiprocketCredentials());
  } catch {
    return false;
  }
}

export class ShiprocketError extends ApiError {
  constructor(message: string, status = 502, details?: unknown) {
    super(status, `Shiprocket: ${message}`, details);
  }
}

function describeError(data: unknown, status: number): string {
  const d = data as { message?: string; errors?: Record<string, string[] | string> } | null;
  const parts: string[] = [];
  if (d?.message) parts.push(d.message);
  if (d?.errors && typeof d.errors === 'object') {
    for (const [field, v] of Object.entries(d.errors)) {
      parts.push(`${field}: ${Array.isArray(v) ? v.join(', ') : String(v)}`);
    }
  }
  return parts.join(' | ') || `HTTP ${status}`;
}

async function rawLogin(email: string, password: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${BASE()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store'
    });
  } catch (err) {
    throw new ShiprocketError(`could not connect (${(err as Error).message}).`);
  }
  const data = (await res.json().catch(() => ({}))) as { token?: string };
  if (!res.ok || !data.token) {
    throw new ShiprocketError(`login failed — ${describeError(data, res.status)}. Check the API user email and password in Admin → Integrations.`, 400);
  }
  return data.token;
}

async function login(): Promise<string> {
  const creds = await getShiprocketCredentials();
  if (!creds) throw new ShiprocketError('not connected yet. A Super Admin must connect it in Admin → Integrations.', 503);
  const token = await rawLogin(creds.email, creds.password);
  await setPrivateValue(TOKEN_KEY, { token, expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

/** Checks credentials before they are saved (does not store anything). */
export async function verifyShiprocketLogin(email: string, password: string): Promise<void> {
  await rawLogin(email, password);
}

async function getToken(force = false): Promise<string> {
  if (!force) {
    const cached = await getPrivateValue<{ token: string; expiresAt: number }>(TOKEN_KEY);
    if (cached?.token && cached.expiresAt > Date.now() + 60 * 60 * 1000) return cached.token;
  }
  return login();
}

export async function srRequest<T>(method: 'GET' | 'POST', path: string, body?: unknown, retried = false): Promise<T> {
  const token = await getToken(retried);
  let res: Response;
  try {
    res = await fetch(`${BASE()}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store'
    });
  } catch (err) {
    throw new ShiprocketError(`request to ${path} failed (${(err as Error).message}).`);
  }
  if (res.status === 401 && !retried) {
    return srRequest<T>(method, path, body, true); // token expired / revoked → log in again once
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ShiprocketError(describeError(data, res.status), res.status >= 500 ? 502 : 400, data);
  return data as T;
}

// ---------------------------------------------------------------- endpoints

export interface PickupLocation {
  pickup_location: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  phone: string;
}

export async function getPickupLocations(): Promise<PickupLocation[]> {
  const data = await srRequest<{ data?: { shipping_address?: PickupLocation[] } }>('GET', '/settings/company/pickup');
  return data?.data?.shipping_address || [];
}

export interface CourierOption {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  etd?: string;
  estimated_delivery_days?: string | number;
  cod: number;
  rating?: number;
}

export async function getServiceability(p: { pickup: string; delivery: string; weightKg: number; cod: boolean; declaredValue?: number }) {
  const qs = new URLSearchParams({
    pickup_postcode: p.pickup,
    delivery_postcode: p.delivery,
    weight: String(p.weightKg),
    cod: p.cod ? '1' : '0'
  });
  if (p.declaredValue) qs.set('declared_value', String(p.declaredValue));
  const data = await srRequest<{ status?: number; data?: { available_courier_companies?: CourierOption[]; recommended_courier_company_id?: number } }>(
    'GET',
    `/courier/serviceability/?${qs.toString()}`
  );
  return {
    couriers: data?.data?.available_courier_companies || [],
    recommendedId: data?.data?.recommended_courier_company_id ?? null
  };
}

export interface AdhocOrderResponse {
  order_id?: number;
  shipment_id?: number;
  status?: string;
  status_code?: number;
  awb_code?: string;
  courier_name?: string;
}

export function createAdhocOrder(payload: Record<string, unknown>) {
  return srRequest<AdhocOrderResponse>('POST', '/orders/create/adhoc', payload);
}

export function getSrOrder(srOrderId: number) {
  return srRequest<{ data?: Record<string, unknown> }>('GET', `/orders/show/${srOrderId}`);
}

export interface AwbResponse {
  awb_assign_status?: number;
  message?: string;
  response?: { data?: { awb_code?: string; courier_name?: string; courier_company_id?: number; freight_charges?: number; awb_assign_error?: string } };
}

export function assignAwb(shipmentId: number, courierId?: number) {
  return srRequest<AwbResponse>('POST', '/courier/assign/awb', courierId ? { shipment_id: shipmentId, courier_id: courierId } : { shipment_id: shipmentId });
}

export interface PickupResponse {
  pickup_status?: number;
  message?: string;
  response?: { pickup_scheduled_date?: string; pickup_token_number?: string; data?: string };
}

export function generatePickup(shipmentId: number) {
  return srRequest<PickupResponse>('POST', '/courier/generate/pickup', { shipment_id: [shipmentId] });
}

export function generateLabel(shipmentId: number) {
  return srRequest<{ label_created?: number; label_url?: string; response?: string }>('POST', '/courier/generate/label', { shipment_id: [shipmentId] });
}

export function printInvoice(srOrderId: number) {
  return srRequest<{ is_invoice_created?: boolean; invoice_url?: string }>('POST', '/orders/print/invoice', { ids: [srOrderId] });
}

export interface TrackResponse {
  tracking_data?: {
    track_status?: number;
    shipment_status?: number;
    shipment_track?: { current_status?: string; delivered_date?: string; edd?: string }[];
    shipment_track_activities?: { date: string; activity: string; location: string; 'sr-status-label'?: string }[];
    track_url?: string;
    etd?: string;
    error?: string;
  };
}

export function trackAwb(awb: string) {
  return srRequest<TrackResponse>('GET', `/courier/track/awb/${encodeURIComponent(awb)}`);
}

export function cancelSrOrders(srOrderIds: number[]) {
  return srRequest<{ message?: string }>('POST', '/orders/cancel', { ids: srOrderIds });
}

/** Forces a fresh login and fetches pickup locations — used by "Test connection". */
export async function testShiprocket() {
  await getToken(true);
  return getPickupLocations();
}
