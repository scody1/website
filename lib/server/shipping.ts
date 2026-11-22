import { db, num } from './db';
import { ApiError } from './http';
import { getSettingsSection } from './settings';
import { addEvent, changeOrderStatus, getOrder, getOrderRow } from './orders';
import {
  assignAwb, cancelSrOrders, createAdhocOrder, generateLabel, generatePickup, getServiceability, getSrOrder,
  printInvoice, shiprocketConfigured, ShiprocketError, trackAwb
} from './shiprocket';
import { STATUS_RANK, TERMINAL_STATUSES } from '../shared/orderStatus';
import {
  createDelhiveryShipment, delhiveryActiveOrders, delhiveryCancel, delhiveryConfigured, delhiveryLabel, delhiveryQuote,
  delhiveryTrack, mapDelhiveryStatus, requestDelhiveryPickup
} from './delhivery';
import { sendShippedEmail, sendStatusEmail } from './email';
import type { OrderStatus } from '../shared/types';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const PACKAGING_KG = 0.1;
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface PackageSpec {
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}

/** Package estimate from the product weights/dimensions stored on each order line. */
export function estimatePackage(items: Row[]): PackageSpec {
  let weight = PACKAGING_KG;
  let length = 10;
  let breadth = 10;
  let height = 0;
  for (const it of items) {
    weight += num(it.weight_kg) * it.quantity;
    length = Math.max(length, num(it.length_cm));
    breadth = Math.max(breadth, num(it.breadth_cm));
    height += num(it.height_cm) * it.quantity;
  }
  return { weightKg: round2(Math.max(weight, 0.1)), lengthCm: Math.ceil(length), breadthCm: Math.ceil(breadth), heightCm: Math.ceil(Math.max(Math.min(height, 150), 1)) };
}

/** Maps a Shiprocket / courier status text to our order status (null = no change). */
export function mapCourierStatus(raw: string | null | undefined): OrderStatus | null {
  const s = (raw || '').toUpperCase().replace(/_/g, ' ').trim();
  if (!s) return null;
  if (s.includes('RTO')) return 'RTO';
  if (s.includes('UNDELIVERED') || s.includes('NDR') || s.includes('LOST') || s.includes('DAMAGED') || s.includes('CANCEL')) return null;
  if (s.includes('OUT FOR DELIVERY')) return 'OUT_FOR_DELIVERY';
  if (s.includes('DELIVERED')) return 'DELIVERED';
  if (s.includes('TRANSIT') || s.includes('REACHED') || s.includes('DESTINATION HUB') || s.includes('IN-TRANSIT')) return 'IN_TRANSIT';
  if (s.includes('PICKED UP') || s === 'SHIPPED' || s.includes('PICKUP DONE')) return 'SHIPPED';
  if (s.includes('OUT FOR PICKUP') || s.includes('PICKUP SCHEDULED') || s.includes('PICKUP GENERATED') || s.includes('PICKUP QUEUED')) return 'PICKUP_SCHEDULED';
  if (s.includes('AWB ASSIGNED') || s.includes('READY TO SHIP') || s.includes('MANIFEST')) return 'READY_TO_SHIP';
  return null;
}

/** Applies a courier status update; only ever moves an order forward. */
export async function applyCourierStatus(orderId: string, raw: string, source: string, explicit?: OrderStatus | null) {
  const sql = db();
  const o = await getOrderRow(sql, orderId);
  await sql`UPDATE orders SET shipping_status = ${raw}, last_tracking_sync = now(), updated_at = now() WHERE id = ${orderId}`;
  const mapped = explicit === undefined ? mapCourierStatus(raw) : explicit;
  const current = o.status as OrderStatus;
  if (!mapped || TERMINAL_STATUSES.includes(current) || current === 'PENDING_PAYMENT') return;
  if (current === mapped) return;
  if (mapped !== 'RTO' && STATUS_RANK[mapped] <= STATUS_RANK[current]) return;
  if (current === 'DELIVERED' && mapped === 'RTO') return;
  await changeOrderStatus(orderId, mapped, `Courier update (${source}): ${raw}`, 'courier');
  if (mapped === 'DELIVERED') await sendStatusEmail(orderId, 'DELIVERED');
}

async function requireShipReady(o: Row, provider: 'SHIPROCKET' | 'DELHIVERY' = 'SHIPROCKET') {
  if (provider === 'SHIPROCKET' && !(await shiprocketConfigured())) {
    throw new ApiError(503, 'Shiprocket is not connected yet. A Super Admin must connect it in Admin → Integrations.');
  }
  if (provider === 'DELHIVERY' && !(await delhiveryConfigured())) {
    throw new ApiError(503, 'Delhivery is not connected yet. A Super Admin must connect it in Admin → Integrations.');
  }
  if (o.courier_provider && o.courier_provider !== provider && o.awb_code) {
    throw new ApiError(400, `This order is already booked with ${o.courier_provider === 'MANUAL' ? 'a manual courier' : o.courier_provider}. Cancel that shipment first.`);
  }
  if (provider === 'DELHIVERY' && o.courier_provider === 'SHIPROCKET' && o.sr_order_id) {
    throw new ApiError(400, 'This order already exists in Shiprocket. Cancel the Shiprocket shipment first.');
  }
  const status = o.status as OrderStatus;
  if (status === 'PENDING_PAYMENT') throw new ApiError(400, 'This order has not been paid yet.');
  if (['CANCELLED', 'REFUNDED', 'RTO', 'DELIVERED'].includes(status)) throw new ApiError(400, 'This order can no longer be shipped.');
  if (o.payment_method !== 'COD' && o.payment_status !== 'PAID') {
    throw new ApiError(400, 'Verify the payment before shipping a prepaid order.');
  }
  if (o.courier_provider === 'MANUAL') throw new ApiError(400, 'This order was shipped manually.');
  const business = await getSettingsSection('business');
  if (provider === 'SHIPROCKET' && !business.shiprocketPickupNickname) {
    throw new ApiError(400, 'Set the Shiprocket pickup location name in "Shipping Setup" first.');
  }
  if (provider === 'DELHIVERY' && !business.delhiveryPickupName) {
    throw new ApiError(400, 'Set the Delhivery warehouse name in "Shipping Setup" first.');
  }
  if (!business.pincode) throw new ApiError(400, 'Set your pickup pincode in "Store & Pickup Address" first.');
  return business;
}

// ---------------------------------------------------------------- Delhivery (direct)

export async function getDelhiveryQuote(orderId: string, weightKg?: number) {
  const sql = db();
  const o = await getOrderRow(sql, orderId);
  await requireShipReady(o, 'DELHIVERY');
  const items = await sql`SELECT * FROM order_items WHERE order_id = ${orderId}`;
  const pkg = estimatePackage(items);
  const q = await delhiveryQuote(o, weightKg || pkg.weightKg);
  return { package: pkg, ...q };
}

/**
 * Books directly with the store's Delhivery account: create shipment (Delhivery assigns
 * the waybill) → request pickup → label. Each step is saved, so retrying resumes.
 */
export async function shipWithDelhivery(orderId: string, opts: { by?: string; courierRate?: number; package?: Partial<PackageSpec> }) {
  const sql = db();
  let o = await getOrderRow(sql, orderId);
  await requireShipReady(o, 'DELHIVERY');
  const items = await sql`SELECT * FROM order_items WHERE order_id = ${orderId}`;
  const pkg = { ...estimatePackage(items), ...Object.fromEntries(Object.entries(opts.package || {}).filter(([, v]) => v && v > 0)) } as PackageSpec;
  const by = opts.by || 'admin';

  if (!o.awb_code) {
    let waybill: string;
    try {
      waybill = await createDelhiveryShipment({ order: o, items, ...pkg });
    } catch (err) {
      await addEvent(sql, orderId, 'WARNING', `Delhivery booking failed: ${(err as Error).message}`, 'system');
      throw err;
    }
    await sql`
      UPDATE orders SET courier_provider = 'DELHIVERY', awb_code = ${waybill}, courier_name = 'Delhivery',
        tracking_url = ${`https://www.delhivery.com/track/package/${waybill}`}, package_weight_kg = ${pkg.weightKg},
        shipping_cost = COALESCE(${opts.courierRate ?? null}, shipping_cost), updated_at = now()
      WHERE id = ${orderId}
    `;
    await addEvent(sql, orderId, 'SHIPPING', `Booked with Delhivery — waybill ${waybill}.`, by);
    if (STATUS_RANK[o.status as OrderStatus] < STATUS_RANK.READY_TO_SHIP) await changeOrderStatus(orderId, 'READY_TO_SHIP', 'Waybill assigned', 'system');
    await sendShippedEmail(orderId);
    o = await getOrderRow(sql, orderId);
  }

  if (!o.pickup_scheduled_for) {
    try {
      const when = await requestDelhiveryPickup(1);
      await sql`UPDATE orders SET pickup_scheduled_for = ${when}, updated_at = now() WHERE id = ${orderId}`;
      await addEvent(sql, orderId, 'SHIPPING', `Delhivery pickup requested for ${when}.`, by);
    } catch (err) {
      await addEvent(sql, orderId, 'WARNING', `Delhivery pickup request failed: ${(err as Error).message}`, 'system');
      throw err;
    }
    o = await getOrderRow(sql, orderId);
    if (STATUS_RANK[o.status as OrderStatus] < STATUS_RANK.PICKUP_SCHEDULED) await changeOrderStatus(orderId, 'PICKUP_SCHEDULED', 'Pickup requested with Delhivery', 'system');
  }

  if (!o.label_url) {
    try {
      const url = await delhiveryLabel(o.awb_code);
      await sql`UPDATE orders SET label_url = ${url}, updated_at = now() WHERE id = ${orderId}`;
    } catch {
      /* label can be fetched later from the order page */
    }
  }
  return getOrder(orderId);
}

export async function getCourierRates(orderId: string, weightKg?: number) {
  const sql = db();
  const o = await getOrderRow(sql, orderId);
  const business = await requireShipReady(o);
  const items = await sql`SELECT * FROM order_items WHERE order_id = ${orderId}`;
  const pkg = estimatePackage(items);
  const { couriers, recommendedId } = await getServiceability({
    pickup: business.pincode,
    delivery: o.pincode,
    weightKg: weightKg || pkg.weightKg,
    cod: o.payment_method === 'COD',
    declaredValue: o.total
  });
  return {
    package: pkg,
    recommendedId,
    couriers: couriers
      .map((c) => ({
        id: c.courier_company_id,
        name: c.courier_name,
        rate: Math.round(Number(c.rate) || 0),
        etd: c.etd || null,
        estimatedDays: c.estimated_delivery_days ? Number(c.estimated_delivery_days) : null,
        cod: c.cod === 1,
        rating: c.rating ?? null
      }))
      .sort((a, b) => a.rate - b.rate)
  };
}

export interface ShipOptions {
  by?: string;
  courierId?: number;
  courierRate?: number;
  package?: Partial<PackageSpec>;
}

/**
 * Books the shipment on Shiprocket step by step: create order → assign AWB →
 * schedule pickup → generate label. Every completed step is saved immediately,
 * so calling this again resumes from the step that failed — it never creates
 * duplicates and never invents tracking numbers.
 */
export async function shipWithShiprocket(orderId: string, opts: ShipOptions) {
  const sql = db();
  let o = await getOrderRow(sql, orderId);
  const business = await requireShipReady(o);
  const items = await sql`SELECT * FROM order_items WHERE order_id = ${orderId}`;
  const pkg = { ...estimatePackage(items), ...Object.fromEntries(Object.entries(opts.package || {}).filter(([, v]) => v && v > 0)) } as PackageSpec;

  const fail = async (step: string, err: unknown): Promise<never> => {
    const msg = err instanceof Error ? err.message : String(err);
    await addEvent(sql, orderId, 'WARNING', `${step} failed: ${msg}`, 'system');
    throw err instanceof ApiError ? err : new ShiprocketError(msg);
  };

  // ---- Step 1: create the order in Shiprocket
  if (!o.sr_shipment_id) {
    const [firstName, ...rest] = String(o.customer_name).trim().split(/\s+/);
    const payload = {
      order_id: o.order_number,
      order_date: new Date(o.created_at).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).slice(0, 16),
      pickup_location: business.shiprocketPickupNickname,
      billing_customer_name: firstName,
      billing_last_name: rest.join(' ') || '.',
      billing_address: o.address_line1,
      billing_address_2: o.address_line2 || '',
      billing_city: o.city,
      billing_pincode: o.pincode,
      billing_state: o.state,
      billing_country: 'India',
      billing_email: o.customer_email || process.env.SHIPROCKET_FALLBACK_EMAIL || '',
      billing_phone: o.customer_phone,
      shipping_is_billing: true,
      order_items: items.map((it) => ({
        name: it.name,
        sku: it.sku,
        units: it.quantity,
        selling_price: it.unit_price,
        discount: 0,
        tax: num(it.gst_rate) || '',
        hsn: it.hsn_code || ''
      })),
      payment_method: o.payment_method === 'COD' ? 'COD' : 'Prepaid',
      shipping_charges: o.shipping_fee,
      transaction_charges: o.cod_fee,
      giftwrap_charges: 0,
      total_discount: o.discount,
      sub_total: o.subtotal,
      length: pkg.lengthCm,
      breadth: pkg.breadthCm,
      height: pkg.heightCm,
      weight: pkg.weightKg
    };
    let created;
    try {
      created = await createAdhocOrder(payload);
    } catch (err) {
      return fail('Shiprocket order creation', err);
    }
    if (!created?.shipment_id || !created?.order_id) {
      return fail('Shiprocket order creation', new ShiprocketError(`unexpected response ${JSON.stringify(created).slice(0, 300)}`));
    }
    await sql`
      UPDATE orders SET courier_provider = 'SHIPROCKET', sr_order_id = ${created.order_id}, sr_shipment_id = ${created.shipment_id},
        package_weight_kg = ${pkg.weightKg}, updated_at = now() WHERE id = ${orderId}
    `;
    await addEvent(sql, orderId, 'SHIPPING', `Created in Shiprocket (order ${created.order_id}, shipment ${created.shipment_id}).`, opts.by || 'admin');

    // Safety check: confirm Shiprocket computed the same order value we will collect.
    try {
      const details = await getSrOrder(created.order_id);
      const srTotal = Number((details?.data as Row | undefined)?.total ?? NaN);
      if (Number.isFinite(srTotal) && Math.round(srTotal) !== o.total) {
        await addEvent(sql, orderId, 'WARNING',
          `Shiprocket shows order value ₹${srTotal} but the order total is ₹${o.total}. ${o.payment_method === 'COD' ? 'Fix the COD amount in the Shiprocket panel before pickup.' : ''}`.trim());
      }
    } catch {
      /* the check is best-effort */
    }
    o = await getOrderRow(sql, orderId);
  }

  // ---- Step 2: assign AWB (courier)
  if (!o.awb_code) {
    let awb;
    try {
      awb = await assignAwb(Number(o.sr_shipment_id), opts.courierId);
    } catch (err) {
      return fail('AWB assignment', err);
    }
    const data = awb?.response?.data;
    if (awb?.awb_assign_status !== 1 || !data?.awb_code) {
      return fail('AWB assignment', new ShiprocketError(data?.awb_assign_error || awb?.message || 'no AWB returned (check wallet balance / courier serviceability)'));
    }
    const cost = Number.isFinite(Number(data.freight_charges)) && Number(data.freight_charges) > 0
      ? Math.round(Number(data.freight_charges))
      : opts.courierRate ?? null;
    await sql`
      UPDATE orders SET awb_code = ${data.awb_code}, courier_name = ${data.courier_name || null},
        courier_company_id = ${data.courier_company_id || null},
        tracking_url = ${`https://shiprocket.co/tracking/${data.awb_code}`},
        shipping_cost = COALESCE(${cost}, shipping_cost), updated_at = now()
      WHERE id = ${orderId}
    `;
    await addEvent(sql, orderId, 'SHIPPING', `AWB ${data.awb_code} assigned (${data.courier_name || 'courier'}).`, opts.by || 'admin');
    if (STATUS_RANK[o.status as OrderStatus] < STATUS_RANK.READY_TO_SHIP) {
      await changeOrderStatus(orderId, 'READY_TO_SHIP', 'AWB assigned', 'system');
    }
    await sendShippedEmail(orderId);
    o = await getOrderRow(sql, orderId);
  }

  // ---- Step 3: schedule pickup
  if (!o.pickup_scheduled_for) {
    try {
      const p = await generatePickup(Number(o.sr_shipment_id));
      if (p?.pickup_status !== 1) throw new ShiprocketError(p?.message || p?.response?.data || 'pickup was not scheduled');
      const when = p.response?.pickup_scheduled_date || 'Scheduled';
      await sql`UPDATE orders SET pickup_scheduled_for = ${when}, updated_at = now() WHERE id = ${orderId}`;
      await addEvent(sql, orderId, 'SHIPPING', `Pickup scheduled (${when}).`, opts.by || 'admin');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/already/i.test(msg)) {
        await sql`UPDATE orders SET pickup_scheduled_for = 'Already in pickup queue', updated_at = now() WHERE id = ${orderId}`;
      } else {
        return fail('Pickup scheduling', err);
      }
    }
    o = await getOrderRow(sql, orderId);
    if (STATUS_RANK[o.status as OrderStatus] < STATUS_RANK.PICKUP_SCHEDULED) {
      await changeOrderStatus(orderId, 'PICKUP_SCHEDULED', 'Pickup scheduled with courier', 'system');
    }
  }

  // ---- Step 4: label (non-fatal: can be retried from the order page)
  if (!o.label_url) await fetchLabel(orderId).catch(() => null);

  return getOrder(orderId);
}

export async function fetchLabel(orderId: string): Promise<string> {
  const sql = db();
  const o = await getOrderRow(sql, orderId);
  if (o.courier_provider === 'DELHIVERY' && o.awb_code) {
    const url = await delhiveryLabel(o.awb_code);
    await sql`UPDATE orders SET label_url = ${url}, updated_at = now() WHERE id = ${orderId}`;
    return url;
  }
  if (!o.sr_shipment_id || !o.awb_code) throw new ApiError(400, 'Assign an AWB before generating the label.');
  const res = await generateLabel(Number(o.sr_shipment_id));
  if (!res?.label_url) throw new ShiprocketError(res?.response || 'label not generated yet, try again in a minute');
  await sql`UPDATE orders SET label_url = ${res.label_url}, updated_at = now() WHERE id = ${orderId}`;
  return res.label_url;
}

export async function fetchSrInvoice(orderId: string): Promise<string> {
  const sql = db();
  const o = await getOrderRow(sql, orderId);
  if (!o.sr_order_id) throw new ApiError(400, 'This order is not in Shiprocket yet.');
  const res = await printInvoice(Number(o.sr_order_id));
  if (!res?.invoice_url) throw new ShiprocketError('invoice not available');
  await sql`UPDATE orders SET sr_invoice_url = ${res.invoice_url}, updated_at = now() WHERE id = ${orderId}`;
  return res.invoice_url;
}

export async function syncTracking(orderId: string) {
  const sql = db();
  const o = await getOrderRow(sql, orderId);
  if (o.courier_provider === 'DELHIVERY' && o.awb_code) {
    const t = await delhiveryTrack(o.awb_code);
    if (t) await applyCourierStatus(orderId, t.status, 'Delhivery tracking', mapDelhiveryStatus(t.status, t.statusType));
    else await sql`UPDATE orders SET last_tracking_sync = now() WHERE id = ${orderId}`;
    return { status: t?.status || null, activities: [] };
  }
  if (o.courier_provider !== 'SHIPROCKET' || !o.awb_code) throw new ApiError(400, 'Only Shiprocket or Delhivery shipments with an AWB can be tracked automatically.');
  const res = await trackAwb(o.awb_code);
  const t = res?.tracking_data;
  if (t?.error) throw new ShiprocketError(t.error, 400);
  const latest = t?.shipment_track?.[0]?.current_status || t?.shipment_track_activities?.[0]?.['sr-status-label'] || t?.shipment_track_activities?.[0]?.activity;
  if (t?.track_url) await sql`UPDATE orders SET tracking_url = ${t.track_url} WHERE id = ${orderId}`;
  if (latest) await applyCourierStatus(orderId, latest, 'Shiprocket tracking');
  else await sql`UPDATE orders SET last_tracking_sync = now() WHERE id = ${orderId}`;
  return { status: latest || null, activities: (t?.shipment_track_activities || []).slice(0, 25) };
}

/** Syncs every active Shiprocket / Delhivery shipment (used by the cron endpoint). */
export async function syncAllActiveShipments(limit = 40) {
  const sr = (await shiprocketConfigured())
    ? await db()<{ id: string }[]>`
        SELECT id FROM orders
        WHERE courier_provider = 'SHIPROCKET' AND awb_code IS NOT NULL
          AND status IN ('READY_TO_SHIP','PICKUP_SCHEDULED','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY')
        ORDER BY last_tracking_sync NULLS FIRST LIMIT ${limit}`
    : [];
  const dl = (await delhiveryConfigured()) ? await delhiveryActiveOrders(limit) : [];
  const rows = [...sr, ...dl];
  let ok = 0;
  const errors: string[] = [];
  for (const r of rows) {
    try {
      await syncTracking(r.id);
      ok++;
    } catch (err) {
      errors.push(`${r.id}: ${(err as Error).message}`);
    }
  }
  return { checked: rows.length, ok, errors };
}

/** Cancels the shipment in Shiprocket (only before it is picked up). */
export async function cancelShipment(orderId: string, by = 'admin') {
  const sql = db();
  const o = await getOrderRow(sql, orderId);
  if (STATUS_RANK[o.status as OrderStatus] >= STATUS_RANK.SHIPPED && !TERMINAL_STATUSES.includes(o.status)) {
    throw new ApiError(400, 'The parcel has already been picked up. Request an RTO from the courier panel instead.');
  }
  if (o.courier_provider === 'DELHIVERY' && o.awb_code) {
    await delhiveryCancel(o.awb_code);
    await sql`
      UPDATE orders SET courier_provider = NULL, awb_code = NULL, courier_name = NULL, tracking_url = NULL, label_url = NULL,
        pickup_scheduled_for = NULL, shipping_status = 'Cancelled in Delhivery', updated_at = now()
      WHERE id = ${orderId}
    `;
    await addEvent(sql, orderId, 'SHIPPING', `Delhivery waybill ${o.awb_code} cancelled.`, by);
    const fresh = await getOrderRow(sql, orderId);
    if (['READY_TO_SHIP', 'PICKUP_SCHEDULED'].includes(fresh.status)) {
      await db()`UPDATE orders SET status = 'PACKED', updated_at = now() WHERE id = ${orderId}`;
      await addEvent(sql, orderId, 'STATUS', 'Status moved back to Packed after shipment cancellation.', by);
    }
    return;
  }
  if (!o.sr_order_id) throw new ApiError(400, 'This order has no courier shipment to cancel.');
  await cancelSrOrders([Number(o.sr_order_id)]);
  await sql`
    UPDATE orders SET courier_provider = NULL, sr_order_id = NULL, sr_shipment_id = NULL, awb_code = NULL, courier_name = NULL,
      courier_company_id = NULL, tracking_url = NULL, label_url = NULL, sr_invoice_url = NULL, pickup_scheduled_for = NULL,
      shipping_status = 'Cancelled in Shiprocket', updated_at = now()
    WHERE id = ${orderId}
  `;
  await addEvent(sql, orderId, 'SHIPPING', `Shiprocket order ${o.sr_order_id} cancelled.`, by);
  const fresh = await getOrderRow(sql, orderId);
  if (['READY_TO_SHIP', 'PICKUP_SCHEDULED'].includes(fresh.status)) {
    await db()`UPDATE orders SET status = 'PACKED', updated_at = now() WHERE id = ${orderId}`;
    await addEvent(sql, orderId, 'STATUS', 'Status moved back to Packed after shipment cancellation.', by);
  }
}

/** Handles a Shiprocket tracking webhook delivery. */
export async function handleTrackingWebhook(payload: Row) {
  const awb = payload.awb ? String(payload.awb) : null;
  const channelOrderId = payload.order_id ? String(payload.order_id) : null;
  const srOrderId = payload.sr_order_id ? Number(payload.sr_order_id) : null;
  const status = String(payload.current_status || payload.shipment_status || '').trim();
  if (!status) return { matched: false };

  const sql = db();
  const [o] = await sql`
    SELECT id FROM orders
    WHERE (${awb}::text IS NOT NULL AND awb_code = ${awb})
       OR (${channelOrderId}::text IS NOT NULL AND order_number = ${channelOrderId})
       OR (${srOrderId}::bigint IS NOT NULL AND sr_order_id = ${srOrderId})
    LIMIT 1
  `;
  if (!o) return { matched: false };
  await applyCourierStatus(o.id, status, 'Shiprocket webhook');
  return { matched: true, orderId: o.id as string };
}
