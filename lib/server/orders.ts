import { z } from 'zod';
import { db, iso, isoOrNull, num, numOrNull, Sql, Tx } from './db';
import { ApiError } from './http';
import { getSettingsSection } from './settings';
import { createRazorpayOrder, fetchRazorpayPayment, razorpayConfigured, razorpayKeyId, refundRazorpayPayment } from './razorpay';
import { sendNewOrderEmails, sendShippedEmail, sendStatusEmail } from './email';
import { checkPincode } from './pincode';
import { computeQuote } from '../shared/pricing';
import { allowedNextStatuses, ORDER_STATUS_LABEL } from '../shared/orderStatus';
import { normalisePhone } from '../shared/format';
import type {
  AdminOrder, OrderStatus, PaymentMethod, PaymentSettings, PaymentStatus, PublicCoupon, PublicTracking, Quote
} from '../shared/types';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Q = Sql | Tx;

export const PAYMENT_WINDOW_MINUTES = 30;

// ---------------------------------------------------------------- input schemas

const itemsSchema = z.array(z.object({
  productId: z.string().uuid('Invalid product'),
  quantity: z.coerce.number().int().min(1).max(50)
})).min(1, 'Your cart is empty').max(30);

export const quoteSchema = z.object({
  items: itemsSchema,
  couponCode: z.string().trim().toUpperCase().max(30).nullish(),
  paymentMethod: z.enum(['COD', 'UPI', 'RAZORPAY']).nullish(),
  pincode: z.string().trim().regex(/^[0-9]{6}$/).nullish()
});

export const checkoutSchema = z.object({
  items: itemsSchema,
  couponCode: z.string().trim().toUpperCase().max(30).nullish(),
  paymentMethod: z.enum(['COD', 'UPI', 'RAZORPAY']),
  utrNumber: z.string().trim().nullish(),
  customer: z.object({
    name: z.string().trim().min(2, 'Enter your full name').max(100),
    phone: z.string().transform(normalisePhone).refine((p) => /^[6-9][0-9]{9}$/.test(p), 'Enter a valid 10-digit mobile number'),
    email: z.string().trim().max(200).refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email').default(''),
    addressLine1: z.string().trim().min(5, 'Enter your full street address').max(300),
    addressLine2: z.string().trim().max(300).default(''),
    city: z.string().trim().min(2, 'Enter your city').max(100),
    state: z.string().trim().min(2, 'Enter your state').max(100),
    pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit pincode')
  })
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// ---------------------------------------------------------------- helpers

export async function addEvent(q: Q, orderId: string, kind: string, message: string, actor = 'system') {
  await q`INSERT INTO order_events (order_id, kind, message, actor) VALUES (${orderId}, ${kind}, ${message}, ${actor})`;
}

interface LoadedCoupon extends PublicCoupon { id: string }

async function loadCoupon(q: Q, code: string, lock: boolean): Promise<{ coupon: LoadedCoupon | null; error: string | null }> {
  const rows = lock
    ? await q`SELECT * FROM coupons WHERE code = ${code} FOR UPDATE`
    : await q`SELECT * FROM coupons WHERE code = ${code}`;
  const c = rows[0];
  if (!c || !c.is_active) return { coupon: null, error: `Coupon "${code}" is not valid.` };
  const now = Date.now();
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { coupon: null, error: `Coupon "${code}" is not active yet.` };
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return { coupon: null, error: `Coupon "${code}" has expired.` };
  if (c.usage_limit !== null && c.used_count >= c.usage_limit) return { coupon: null, error: `Coupon "${code}" has been fully used.` };
  return {
    coupon: {
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discount_type,
      discountValue: c.discount_value,
      maxDiscount: c.max_discount,
      minOrderValue: c.min_order_value
    },
    error: null
  };
}

export async function validateCouponPublic(code: string, subtotal: number) {
  const { coupon, error } = await loadCoupon(db(), code.trim().toUpperCase(), false);
  if (!coupon) throw new ApiError(400, error as string);
  if (subtotal < coupon.minOrderValue) {
    throw new ApiError(400, `Coupon ${coupon.code} needs a minimum order of ₹${coupon.minOrderValue}.`);
  }
  const { id: _id, ...pub } = coupon;
  return pub;
}

interface PricedCart {
  lines: Row[]; // product row + quantity
  quote: Quote;
  coupon: LoadedCoupon | null;
  problems: string[];
}

/** Loads current prices and stock from the database and prices the cart. */
async function priceCart(
  q: Q,
  items: { productId: string; quantity: number }[],
  couponCode: string | null | undefined,
  paymentMethod: PaymentMethod | null | undefined,
  lock: boolean,
  payments: PaymentSettings
): Promise<PricedCart> {
  // Merge duplicate lines.
  const merged = new Map<string, number>();
  for (const it of items) merged.set(it.productId, (merged.get(it.productId) || 0) + it.quantity);
  const ids = Array.from(merged.keys()).sort(); // stable lock order prevents deadlocks

  const products = lock
    ? await q`SELECT * FROM products WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`
    : await q`SELECT * FROM products WHERE id = ANY(${ids}::uuid[])`;
  const byId = new Map(products.map((p) => [p.id as string, p]));

  const problems: string[] = [];
  const lines: Row[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    const qty = merged.get(id) as number;
    if (!p || !p.is_active) {
      problems.push('An item in your cart is no longer available. Please remove it.');
      continue;
    }
    if (p.stock < qty) {
      problems.push(p.stock === 0 ? `${p.name} is out of stock.` : `Only ${p.stock} unit(s) of ${p.name} are left.`);
    }
    lines.push({ ...p, quantity: qty });
  }

  // NOTE: `payments` is passed in — never query through the pool while holding a
  // transaction connection (it can deadlock when the pool is exhausted).
  let coupon: LoadedCoupon | null = null;
  let couponLoadError: string | null = null;
  if (couponCode) {
    const res = await loadCoupon(q, couponCode, lock);
    coupon = res.coupon;
    couponLoadError = res.error;
  }
  const quote = computeQuote(
    lines.map((l) => ({ unitPrice: l.selling_price, quantity: l.quantity })),
    payments,
    paymentMethod ?? null,
    coupon
  );
  if (couponLoadError) quote.couponError = couponLoadError;
  return { lines, quote, coupon: quote.couponCode ? coupon : null, problems };
}

/** Live courier serviceability for the delivery pincode (Shiprocket / Delhivery when connected). */
async function deliveryCheck(pincode: string | null | undefined) {
  if (!pincode) return null;
  try {
    return await checkPincode(pincode);
  } catch {
    return null; // a courier API problem must never block checkout
  }
}

export async function quoteCart(input: z.infer<typeof quoteSchema>) {
  const base = await getSettingsSection('payments');
  const delivery = await deliveryCheck(input.pincode);
  // COD is offered only where the courier confirms COD for this pincode.
  const payments = delivery?.live && !delivery.codAvailable ? { ...base, enableCod: false } : base;
  const { quote, problems } = await priceCart(db(), input.items, input.couponCode, input.paymentMethod, false, payments);
  if (delivery?.live && !delivery.isServiceable) problems.push(delivery.message);
  return { quote, problems, delivery };
}

export async function restoreStockTx(tx: Tx, orderId: string) {
  const [o] = await tx`SELECT stock_restored, coupon_code FROM orders WHERE id = ${orderId} FOR UPDATE`;
  if (!o || o.stock_restored) return;
  await tx`
    UPDATE products p SET stock = p.stock + oi.quantity, updated_at = now()
    FROM (SELECT product_id, SUM(quantity)::int AS quantity FROM order_items
          WHERE order_id = ${orderId} AND product_id IS NOT NULL GROUP BY product_id) oi
    WHERE p.id = oi.product_id
  `;
  if (o.coupon_code) {
    await tx`UPDATE coupons SET used_count = GREATEST(0, used_count - 1) WHERE code = ${o.coupon_code}`;
  }
  await tx`UPDATE orders SET stock_restored = true WHERE id = ${orderId}`;
  await addEvent(tx, orderId, 'STATUS', 'Stock returned to inventory.');
}

/** Cancels online-payment orders that were never paid, releasing their stock. */
export async function expireStalePayments(): Promise<number> {
  const sql = db();
  const stale = await sql<{ id: string }[]>`
    SELECT id FROM orders WHERE status = 'PENDING_PAYMENT'
      AND created_at < now() - make_interval(mins => ${PAYMENT_WINDOW_MINUTES})
    LIMIT 50
  `;
  for (const { id } of stale) {
    await sql.begin(async (tx) => {
      const [o] = await tx`SELECT status FROM orders WHERE id = ${id} FOR UPDATE`;
      if (!o || o.status !== 'PENDING_PAYMENT') return;
      await tx`
        UPDATE orders SET status = 'CANCELLED', payment_status = 'FAILED',
          cancel_reason = 'Online payment was not completed in time.', updated_at = now()
        WHERE id = ${id}
      `;
      await addEvent(tx, id, 'STATUS', `Cancelled automatically: payment not completed within ${PAYMENT_WINDOW_MINUTES} minutes.`);
      await restoreStockTx(tx, id);
    });
  }
  return stale.length;
}

// ---------------------------------------------------------------- create order

export interface CreatedOrder {
  orderNumber: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  quote: Quote;
  razorpay?: { keyId: string; orderId: string; amount: number; currency: string };
}

/**
 * Places an order. `customerId` comes ONLY from the signed-in customer's session
 * (never from the request body), so nobody can attach orders to another account.
 */
export async function createOrder(input: CheckoutInput, opts: { customerId?: string | null } = {}): Promise<CreatedOrder> {
  const sql = db();
  await expireStalePayments().catch((e) => console.warn('[orders] expiry sweep failed', e));

  const payments = await getSettingsSection('payments');
  const method = input.paymentMethod;

  const delivery = await deliveryCheck(input.customer.pincode);
  if (delivery?.live && !delivery.isServiceable) {
    throw new ApiError(400, 'Sorry, our courier partners do not deliver to this pincode yet. Please use a different address or contact us on WhatsApp.');
  }
  if (delivery?.live && method === 'COD' && !delivery.codAvailable) {
    throw new ApiError(400, 'Cash on Delivery is not available for this pincode. Please choose online payment.');
  }
  let utr: string | null = null;

  if (method === 'COD' && !payments.enableCod) throw new ApiError(400, 'Cash on Delivery is not available right now.');
  if (method === 'UPI') {
    if (!payments.enableUpi || !payments.upiId) throw new ApiError(400, 'UPI payment is not available right now.');
    utr = (input.utrNumber || '').replace(/\D/g, '');
    if (!/^[0-9]{12}$/.test(utr)) throw new ApiError(400, 'Enter the 12-digit UPI transaction reference (UTR) from your payment app.');
    const dup = await sql`SELECT 1 FROM orders WHERE utr_number = ${utr}`;
    if (dup.length) throw new ApiError(409, 'This UTR number has already been used for another order.');
  }
  if (method === 'RAZORPAY' && !(payments.enableRazorpay && (await razorpayConfigured()))) {
    throw new ApiError(400, 'Online card/UPI payment is not available right now.');
  }

  const created = await sql.begin(async (tx) => {
    const priced = await priceCart(tx, input.items, input.couponCode, method, true, payments);
    if (priced.problems.length) throw new ApiError(409, priced.problems.join(' '));
    if (input.couponCode && priced.quote.couponError) throw new ApiError(400, priced.quote.couponError);
    if (method === 'COD' && !priced.quote.codAllowed) {
      throw new ApiError(400, `Cash on Delivery is available only for orders up to ₹${payments.codMaxOrderValue}. Please pay online.`);
    }
    const q = priced.quote;
    const status: OrderStatus = method === 'RAZORPAY' ? 'PENDING_PAYMENT' : 'NEW';
    const paymentStatus: PaymentStatus = method === 'UPI' ? 'AWAITING_VERIFICATION' : 'PENDING';
    const c = input.customer;

    const [order] = await tx`
      INSERT INTO orders (
        customer_id, customer_name, customer_phone, customer_email, address_line1, address_line2, city, state, pincode,
        subtotal, discount, coupon_code, shipping_fee, cod_fee, total,
        payment_method, payment_status, status, utr_number
      ) VALUES (
        ${opts.customerId ?? null}, ${c.name}, ${c.phone}, ${c.email}, ${c.addressLine1}, ${c.addressLine2}, ${c.city}, ${c.state}, ${c.pincode},
        ${q.subtotal}, ${q.discount}, ${q.couponCode}, ${q.shippingFee}, ${q.codFee}, ${q.total},
        ${method}, ${paymentStatus}, ${status}, ${utr}
      ) RETURNING id, order_number
    `;

    if (opts.customerId) {
      // Remember the latest delivery address on the account so it is pre-filled next time.
      await tx`
        UPDATE customers SET address_line1 = ${c.addressLine1}, address_line2 = ${c.addressLine2}, city = ${c.city},
          state = ${c.state}, pincode = ${c.pincode}, updated_at = now()
        WHERE id = ${opts.customerId}
      `;
    }

    for (const l of priced.lines) {
      await tx`
        INSERT INTO order_items (order_id, product_id, name, sku, image_url, unit_price, cost_price, quantity, line_total,
                                 hsn_code, gst_rate, weight_kg, length_cm, breadth_cm, height_cm)
        VALUES (${order.id}, ${l.id}, ${l.name}, ${l.sku}, ${(l.images && l.images[0]) || ''}, ${l.selling_price}, ${l.cost_price},
                ${l.quantity}, ${l.selling_price * l.quantity}, ${l.hsn_code}, ${l.gst_rate}, ${l.weight_kg},
                ${l.length_cm}, ${l.breadth_cm}, ${l.height_cm})
      `;
      const upd = await tx`
        UPDATE products SET stock = stock - ${l.quantity}, updated_at = now()
        WHERE id = ${l.id} AND stock >= ${l.quantity} RETURNING id
      `;
      if (upd.length === 0) throw new ApiError(409, `Sorry, ${l.name} just went out of stock.`);
    }

    if (priced.coupon) {
      const used = await tx`
        UPDATE coupons SET used_count = used_count + 1
        WHERE id = ${priced.coupon.id} AND (usage_limit IS NULL OR used_count < usage_limit) RETURNING id
      `;
      if (used.length === 0) throw new ApiError(409, `Coupon ${priced.coupon.code} has just been fully used.`);
    }

    const label = method === 'COD' ? 'Cash on Delivery' : method === 'UPI' ? `UPI (UTR ${utr}, awaiting verification)` : 'Razorpay (awaiting payment)';
    await addEvent(tx, order.id, 'STATUS', `Order placed — ${label}. Total ₹${q.total}.`, 'customer');
    return { id: order.id as string, orderNumber: order.order_number as string, quote: q, status, paymentStatus };
  });

  const result: CreatedOrder = {
    orderNumber: created.orderNumber,
    total: created.quote.total,
    paymentMethod: method,
    paymentStatus: created.paymentStatus,
    status: created.status,
    quote: created.quote
  };

  if (method === 'RAZORPAY') {
    try {
      const rzp = await createRazorpayOrder(created.quote.total, created.orderNumber, { order_number: created.orderNumber });
      await sql`UPDATE orders SET razorpay_order_id = ${rzp.id}, updated_at = now() WHERE id = ${created.id}`;
      result.razorpay = { keyId: await razorpayKeyId(), orderId: rzp.id, amount: rzp.amount, currency: rzp.currency };
    } catch (err) {
      // Could not start the payment: release the stock immediately.
      await sql.begin(async (tx) => {
        await tx`UPDATE orders SET status = 'CANCELLED', payment_status = 'FAILED',
                 cancel_reason = 'Payment gateway unavailable', updated_at = now() WHERE id = ${created.id}`;
        await addEvent(tx, created.id, 'STATUS', 'Cancelled: could not start Razorpay payment.');
        await restoreStockTx(tx, created.id);
      });
      throw err;
    }
  }
  if (method !== 'RAZORPAY') await sendNewOrderEmails(created.id);
  return result;
}

/** Returns Razorpay checkout details again so a customer can retry a pending payment. */
export async function getPendingRazorpay(orderNumber: string, phone: string) {
  const [o] = await db()`
    SELECT razorpay_order_id, total, status FROM orders
    WHERE order_number = ${orderNumber} AND customer_phone = ${normalisePhone(phone)} AND payment_method = 'RAZORPAY'
  `;
  if (!o) throw new ApiError(404, 'Order not found.');
  if (o.status !== 'PENDING_PAYMENT' || !o.razorpay_order_id) throw new ApiError(409, 'This order is no longer awaiting payment.');
  return { keyId: await razorpayKeyId(), orderId: o.razorpay_order_id as string, amount: o.total * 100, currency: 'INR' };
}

/**
 * Marks a Razorpay order as paid. Idempotent — safe to call from both the
 * checkout callback and the webhook.
 */
export async function markRazorpayPaid(razorpayOrderId: string, paymentId: string, amountPaise: number, actor: string) {
  const result = await markRazorpayPaidTx(razorpayOrderId, paymentId, amountPaise, actor);
  if (result.newlyPaid) await sendNewOrderEmails(result.orderId);
  if (result.lateOnClosedOrder) {
    // Money arrived for an order that was already cancelled/expired: give it back automatically.
    try {
      await refundOrder(result.orderId, { amount: amountPaise / 100, note: 'Automatic refund: payment received after the order was cancelled', method: 'razorpay' }, 'system');
    } catch (err) {
      await addEvent(db(), result.orderId, 'WARNING', `Automatic refund of the late payment failed: ${(err as Error).message}. Refund it from the order page.`, 'system');
    }
  }
  return { orderNumber: result.orderNumber, status: result.status };
}

async function markRazorpayPaidTx(razorpayOrderId: string, paymentId: string, amountPaise: number, actor: string) {
  return db().begin(async (tx) => {
    const [o] = await tx`SELECT * FROM orders WHERE razorpay_order_id = ${razorpayOrderId} FOR UPDATE`;
    if (!o) throw new ApiError(404, 'Order for this payment was not found.');
    if (o.payment_status === 'PAID') return { orderId: o.id as string, orderNumber: o.order_number as string, status: o.status as OrderStatus, newlyPaid: false, lateOnClosedOrder: false };

    if (amountPaise !== o.total * 100) {
      await addEvent(tx, o.id, 'WARNING', `Payment ${paymentId} amount ₹${amountPaise / 100} does not match order total ₹${o.total}. Not marked as paid — check Razorpay dashboard.`, actor);
      throw new ApiError(400, 'Payment amount mismatch.');
    }

    if (o.status === 'PENDING_PAYMENT') {
      await tx`
        UPDATE orders SET payment_status = 'PAID', status = 'NEW', razorpay_payment_id = ${paymentId},
          paid_at = now(), updated_at = now() WHERE id = ${o.id}
      `;
      await addEvent(tx, o.id, 'PAYMENT', `Payment received via Razorpay (${paymentId}).`, actor);
      return { orderId: o.id as string, orderNumber: o.order_number as string, status: 'NEW' as OrderStatus, newlyPaid: true, lateOnClosedOrder: false };
    }

    // Paid after the order had already been auto-cancelled.
    await tx`UPDATE orders SET payment_status = 'PAID', razorpay_payment_id = ${paymentId}, paid_at = now(), updated_at = now() WHERE id = ${o.id}`;
    await addEvent(tx, o.id, 'WARNING', `Payment ${paymentId} arrived after the order was ${ORDER_STATUS_LABEL[o.status as OrderStatus]}. It is being refunded automatically.`, actor);
    return { orderId: o.id as string, orderNumber: o.order_number as string, status: o.status as OrderStatus, newlyPaid: false, lateOnClosedOrder: true };
  });
}

// ---------------------------------------------------------------- reads

function mapOrder(r: Row, items: Row[] = [], events?: Row[]): AdminOrder {
  return {
    id: r.id,
    orderNumber: r.order_number,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    customer: {
      name: r.customer_name,
      phone: r.customer_phone,
      email: r.customer_email,
      addressLine1: r.address_line1,
      addressLine2: r.address_line2,
      city: r.city,
      state: r.state,
      pincode: r.pincode
    },
    items: items.map((i) => ({
      productId: i.product_id,
      name: i.name,
      sku: i.sku,
      image: i.image_url,
      unitPrice: i.unit_price,
      costPrice: i.cost_price,
      quantity: i.quantity,
      lineTotal: i.line_total,
      hsnCode: i.hsn_code,
      gstRate: num(i.gst_rate)
    })),
    subtotal: r.subtotal,
    discount: r.discount,
    couponCode: r.coupon_code,
    shippingFee: r.shipping_fee,
    codFee: r.cod_fee,
    total: r.total,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    status: r.status,
    utrNumber: r.utr_number,
    razorpayOrderId: r.razorpay_order_id,
    razorpayPaymentId: r.razorpay_payment_id,
    paidAt: isoOrNull(r.paid_at),
    adminNotes: r.admin_notes,
    cancelReason: r.cancel_reason,
    refundNotes: r.refund_notes,
    refundAmount: r.refund_amount ?? null,
    razorpayRefundId: r.razorpay_refund_id ?? null,
    refundedAt: isoOrNull(r.refunded_at),
    refundDue: ['CANCELLED', 'RTO'].includes(r.status) && r.payment_status === 'PAID' ? Math.max(0, r.total - (r.refund_amount || 0)) : 0,
    customerAccount: Boolean(r.customer_id),
    shipping: {
      provider: r.courier_provider,
      srOrderId: numOrNull(r.sr_order_id),
      srShipmentId: numOrNull(r.sr_shipment_id),
      courierName: r.courier_name,
      awbCode: r.awb_code,
      trackingUrl: r.tracking_url,
      labelUrl: r.label_url,
      invoiceUrl: r.sr_invoice_url,
      pickupScheduledFor: r.pickup_scheduled_for,
      shippingStatus: r.shipping_status,
      shippingCost: r.shipping_cost,
      packageWeightKg: numOrNull(r.package_weight_kg),
      lastTrackingSync: isoOrNull(r.last_tracking_sync)
    },
    events: events?.map((e) => ({ id: num(e.id), kind: e.kind, message: e.message, actor: e.actor, createdAt: iso(e.created_at) }))
  };
}

export async function getOrderRow(q: Q, id: string, lock = false): Promise<Row> {
  const [o] = lock ? await q`SELECT * FROM orders WHERE id = ${id} FOR UPDATE` : await q`SELECT * FROM orders WHERE id = ${id}`;
  if (!o) throw new ApiError(404, 'Order not found.');
  return o;
}

export async function getOrder(id: string): Promise<AdminOrder> {
  const sql = db();
  const o = await getOrderRow(sql, id);
  const items = await sql`SELECT * FROM order_items WHERE order_id = ${id} ORDER BY name`;
  const events = await sql`SELECT * FROM order_events WHERE order_id = ${id} ORDER BY created_at DESC, id DESC`;
  const returns = await sql`SELECT * FROM return_requests WHERE order_id = ${id} ORDER BY created_at DESC`;
  const order = mapOrder(o, items, events);
  order.returnRequests = returns.map((r) => ({
    id: r.id, reason: r.reason, refundUpi: r.refund_upi, status: r.status, adminNote: r.admin_note,
    resolvedBy: r.resolved_by, createdAt: iso(r.created_at), resolvedAt: isoOrNull(r.resolved_at)
  }));
  return order;
}

export async function getOrderItemsRaw(id: string) {
  return db()`SELECT * FROM order_items WHERE order_id = ${id}`;
}

export interface OrderListFilters {
  status?: string;
  payment?: string;
  /** 'refunds' = cancelled/RTO and paid but not fully refunded; 'returns' = open return request */
  attention?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function listOrders(f: OrderListFilters) {
  const sql = db();
  await expireStalePayments().catch(() => 0);
  const pageSize = Math.min(Math.max(f.pageSize || 25, 1), 200);
  const page = Math.max(f.page || 1, 1);
  const search = f.q?.trim() ? `%${f.q.trim()}%` : null;

  const where = sql`
    WHERE (${f.status || null}::text IS NULL OR status = ${f.status || null})
      AND (${f.payment || null}::text IS NULL OR payment_status = ${f.payment || null})
      AND (${f.attention || null}::text IS NULL
           OR (${f.attention || null} = 'refunds' AND status IN ('CANCELLED','RTO') AND payment_status = 'PAID' AND COALESCE(refund_amount,0) < total)
           OR (${f.attention || null} = 'returns' AND EXISTS (SELECT 1 FROM return_requests rr WHERE rr.order_id = orders.id AND rr.status = 'OPEN')))
      AND (${search}::text IS NULL OR order_number ILIKE ${search} OR customer_name ILIKE ${search}
           OR customer_phone ILIKE ${search} OR COALESCE(awb_code,'') ILIKE ${search} OR COALESCE(utr_number,'') ILIKE ${search})
  `;
  const [{ count }] = await sql<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM orders ${where}`;
  const rows = await sql`SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  const ids = rows.map((r) => r.id);
  const items = ids.length ? await sql`SELECT * FROM order_items WHERE order_id = ANY(${ids}::uuid[])` : [];
  const byOrder = new Map<string, Row[]>();
  for (const it of items) {
    const list = byOrder.get(it.order_id) || [];
    list.push(it);
    byOrder.set(it.order_id, list);
  }
  return { orders: rows.map((r) => mapOrder(r, byOrder.get(r.id) || [])), total: count, page, pageSize };
}

export async function listOrdersForExport() {
  const sql = db();
  const rows = await sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 20000`;
  const items = await sql`SELECT order_id, name, quantity FROM order_items`;
  const byOrder = new Map<string, Row[]>();
  for (const it of items) {
    const list = byOrder.get(it.order_id) || [];
    list.push(it);
    byOrder.set(it.order_id, list);
  }
  return rows.map((r) => ({ row: r, items: byOrder.get(r.id) || [] }));
}

// ---------------------------------------------------------------- admin updates

export async function changeOrderStatus(id: string, next: OrderStatus, note: string, actor: 'admin' | 'courier' | 'system', by?: string) {
  const who = by || actor;
  return db().begin(async (tx) => {
    const o = await getOrderRow(tx, id, true);
    const current = o.status as OrderStatus;
    if (current === next) return;
    if (actor === 'admin' && !allowedNextStatuses(current).includes(next)) {
      throw new ApiError(400, `An order that is "${ORDER_STATUS_LABEL[current]}" cannot be changed to "${ORDER_STATUS_LABEL[next]}".`);
    }
    if (actor === 'admin' && o.payment_method !== 'COD' && o.payment_status !== 'PAID'
        && !['CANCELLED', 'NEW', 'PROCESSING'].includes(next)) {
      throw new ApiError(400, 'Confirm the payment first. Only paid prepaid orders can be packed or shipped.');
    }

    const sets: Row = { status: next, updated_at: new Date() };
    if (next === 'CANCELLED') sets.cancel_reason = note || o.cancel_reason || 'Cancelled by store';
    if (next === 'REFUNDED') {
      sets.refund_notes = note || o.refund_notes;
      if (o.payment_status === 'PAID') sets.payment_status = 'REFUNDED';
    }
    if (next === 'DELIVERED') {
      sets.delivered_at = new Date();
      if (o.payment_method === 'COD' && o.payment_status === 'PENDING') {
        sets.payment_status = 'PAID';
        sets.paid_at = new Date();
      }
    }
    await tx`UPDATE orders SET ${tx(sets)} WHERE id = ${id}`;
    await addEvent(tx, id, 'STATUS', `Status: ${ORDER_STATUS_LABEL[current]} → ${ORDER_STATUS_LABEL[next]}${note ? ` — ${note}` : ''}`, who);
    if (next === 'DELIVERED' && sets.payment_status === 'PAID') {
      await addEvent(tx, id, 'PAYMENT', 'Cash on Delivery collected by courier (marked paid on delivery).', who);
    }
    if (next === 'CANCELLED' || next === 'RTO') await restoreStockTx(tx, id);
  });
}

export async function verifyUpiPayment(id: string, approve: boolean, note: string, by = 'admin') {
  await db().begin(async (tx) => {
    const o = await getOrderRow(tx, id, true);
    if (o.payment_method !== 'UPI' || o.payment_status !== 'AWAITING_VERIFICATION') {
      throw new ApiError(400, 'This order has no UPI payment waiting for verification.');
    }
    if (approve) {
      await tx`UPDATE orders SET payment_status = 'PAID', paid_at = now(), updated_at = now() WHERE id = ${id}`;
      await addEvent(tx, id, 'PAYMENT', `UPI payment (UTR ${o.utr_number}) verified${note ? ` — ${note}` : ''}.`, by);
    } else {
      await tx`
        UPDATE orders SET payment_status = 'FAILED', status = 'CANCELLED',
          cancel_reason = ${note || 'UPI payment could not be verified'}, updated_at = now()
        WHERE id = ${id}
      `;
      await addEvent(tx, id, 'PAYMENT', `UPI payment (UTR ${o.utr_number}) rejected${note ? ` — ${note}` : ''}. Order cancelled.`, by);
      await restoreStockTx(tx, id);
    }
  });
}

export const orderMetaSchema = z.object({
  adminNotes: z.string().trim().max(5000).optional(),
  shippingCost: z.coerce.number().int().min(0).max(100000).nullable().optional(),
  manualShipment: z.object({
    courierName: z.string().trim().min(2).max(100),
    awbCode: z.string().trim().min(4).max(60),
    trackingUrl: z.string().trim().max(500).refine((v) => v === '' || /^https?:\/\//.test(v), 'Tracking URL must start with https://')
  }).optional()
});

export async function updateOrderMeta(id: string, patch: z.infer<typeof orderMetaSchema>, by = 'admin') {
  await db().begin(async (tx) => {
    const o = await getOrderRow(tx, id, true);
    if (patch.adminNotes !== undefined) {
      await tx`UPDATE orders SET admin_notes = ${patch.adminNotes}, updated_at = now() WHERE id = ${id}`;
    }
    if (patch.shippingCost !== undefined) {
      await tx`UPDATE orders SET shipping_cost = ${patch.shippingCost}, updated_at = now() WHERE id = ${id}`;
    }
    if (patch.manualShipment) {
      if (o.courier_provider === 'SHIPROCKET' && o.awb_code) {
        throw new ApiError(400, 'This order already has a Shiprocket shipment. Cancel it before adding a manual one.');
      }
      const m = patch.manualShipment;
      await tx`
        UPDATE orders SET courier_provider = 'MANUAL', courier_name = ${m.courierName}, awb_code = ${m.awbCode},
          tracking_url = ${m.trackingUrl || null}, updated_at = now() WHERE id = ${id}
      `;
      await addEvent(tx, id, 'SHIPPING', `Manual shipment recorded: ${m.courierName}, AWB ${m.awbCode}.`, by);
    }
  });
  if (patch.manualShipment) await sendShippedEmail(id);
}

// ---------------------------------------------------------------- refunds

export const refundSchema = z.object({
  amount: z.coerce.number().int().positive('Enter the refund amount'),
  note: z.string().trim().max(500).default(''),
  method: z.enum(['razorpay', 'manual'])
});

/**
 * Refunds a paid order (full or partial).
 *  - Razorpay payments are refunded through the Razorpay API (money returns automatically).
 *  - COD / UPI refunds are paid by the store (bank/UPI) and recorded here with a reference.
 * A per-order lock stops two refunds running at the same time, and for Razorpay the
 * amount already refunded is reconciled with Razorpay's own record first, so a refund
 * can never exceed what was paid even if an earlier save failed.
 */
export async function refundOrder(id: string, input: z.infer<typeof refundSchema>, by: string) {
  const sql = db();
  const locked = await sql`
    UPDATE orders SET refund_locked_at = now()
    WHERE id = ${id} AND (refund_locked_at IS NULL OR refund_locked_at < now() - interval '2 minutes')
    RETURNING id
  `;
  if (locked.length === 0) {
    await getOrderRow(sql, id); // 404 if the order does not exist
    throw new ApiError(409, 'Another refund for this order is being processed. Please wait a moment and try again.');
  }

  let full = false;
  try {
    const o = await getOrderRow(sql, id);
    if (o.payment_status !== 'PAID') throw new ApiError(400, 'Only paid orders can be refunded.');
    let already = Number(o.refund_amount || 0);

    if (input.method === 'razorpay') {
      if (o.payment_method !== 'RAZORPAY' || !o.razorpay_payment_id) {
        throw new ApiError(400, 'This order was not paid through Razorpay. Use a manual refund.');
      }
      const payment = await fetchRazorpayPayment(o.razorpay_payment_id);
      const gatewayRefunded = Math.round(Number(payment.amount_refunded || 0) / 100);
      if (gatewayRefunded > already) {
        await addEvent(sql, id, 'WARNING', `Razorpay shows ₹${gatewayRefunded} already refunded (store record said ₹${already}). Record corrected.`, 'system');
        already = gatewayRefunded;
      }
    } else if (!input.note) {
      throw new ApiError(400, 'For a manual refund, note how it was paid (e.g. UPI reference number).');
    }

    const refundable = o.total - already;
    if (refundable <= 0) throw new ApiError(400, 'This order has already been fully refunded.');
    if (input.amount > refundable) throw new ApiError(400, `You can refund at most ₹${refundable} for this order.`);
    full = already + input.amount >= o.total;
    const activeStatuses = ['NEW', 'PROCESSING', 'PACKED', 'READY_TO_SHIP', 'PICKUP_SCHEDULED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'];
    if (full && activeStatuses.includes(o.status)) {
      throw new ApiError(400, 'Cancel the order first — a full refund happens automatically on cancellation. Partial refunds are allowed while the order is active.');
    }

    let refundId: string | null = null;
    if (input.method === 'razorpay') {
      const refund = await refundRazorpayPayment(o.razorpay_payment_id, input.amount, { order_number: o.order_number, by });
      refundId = refund.id;
    }

    await sql.begin(async (tx) => {
      const cur = await getOrderRow(tx, id, true);
      const nextStatus = full && ['DELIVERED', 'RTO'].includes(cur.status) ? 'REFUNDED' : cur.status;
      await tx`
        UPDATE orders SET refund_amount = ${already + input.amount},
          razorpay_refund_id = COALESCE(${refundId}, razorpay_refund_id),
          payment_status = ${full ? 'REFUNDED' : cur.payment_status}, status = ${nextStatus},
          refund_notes = ${[cur.refund_notes, input.note].filter(Boolean).join(' | ')},
          refunded_at = CASE WHEN ${full} THEN now() ELSE refunded_at END, updated_at = now()
        WHERE id = ${id}
      `;
      await addEvent(tx, id, 'PAYMENT',
        `${full ? 'Full' : 'Partial'} refund of ₹${input.amount} ${input.method === 'razorpay' ? `via Razorpay (${refundId})` : 'recorded (paid manually)'}${input.note ? ` — ${input.note}` : ''}.`, by);
      if (full) {
        await tx`UPDATE return_requests SET status = 'COMPLETED', resolved_at = now(), resolved_by = ${by} WHERE order_id = ${id} AND status IN ('OPEN','APPROVED')`;
      }
    });
  } finally {
    await sql`UPDATE orders SET refund_locked_at = NULL WHERE id = ${id}`;
  }
  if (full) await sendStatusEmail(id, 'REFUNDED');
  return getOrder(id);
}

// ---------------------------------------------------------------- return requests

export const returnDecisionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'COMPLETED']),
  note: z.string().trim().max(500).default('')
});

/** Admin decision on a customer's return request. Refunds are then issued from the Refund panel. */
export async function resolveReturnRequest(orderId: string, requestId: string, input: z.infer<typeof returnDecisionSchema>, by: string) {
  const sql = db();
  const [r] = await sql`SELECT * FROM return_requests WHERE id = ${requestId} AND order_id = ${orderId}`;
  if (!r) throw new ApiError(404, 'Return request not found.');
  if (r.status === 'COMPLETED' || r.status === 'REJECTED') throw new ApiError(400, 'This return request is already closed.');
  if (input.status === 'REJECTED' && !input.note) throw new ApiError(400, 'Tell the customer why the return was declined.');
  await sql`
    UPDATE return_requests SET status = ${input.status}, admin_note = ${input.note}, resolved_by = ${by},
      resolved_at = CASE WHEN ${input.status} IN ('REJECTED','COMPLETED') THEN now() ELSE resolved_at END
    WHERE id = ${requestId}
  `;
  await addEvent(sql, orderId, 'NOTE', `Return request ${input.status.toLowerCase()}${input.note ? ` — ${input.note}` : ''}.`, by);
  return getOrder(orderId);
}

// ---------------------------------------------------------------- customer tracking

const TRACKING_REFRESH_MINUTES = 15;

/** Refreshes courier tracking for an order if it is stale (Shiprocket / Delhivery live API). */
async function refreshCourierTracking(o: Row): Promise<Row> {
  const live = o.awb_code && ['SHIPROCKET', 'DELHIVERY'].includes(o.courier_provider)
    && !['CANCELLED', 'REFUNDED', 'DELIVERED'].includes(o.status);
  const stale = !o.last_tracking_sync || Date.now() - new Date(o.last_tracking_sync).getTime() > TRACKING_REFRESH_MINUTES * 60_000;
  if (!live || !stale) return o;
  try {
    const { syncTracking } = await import('./shipping'); // lazy import avoids a module cycle
    await syncTracking(o.id);
    return await getOrderRow(db(), o.id);
  } catch (err) {
    console.warn('[track] live courier refresh failed:', (err as Error).message);
    return o;
  }
}

function publicTracking(o: Row, items: Row[], events: Row[], withPersonal: boolean): PublicTracking {
  return {
    orderNumber: o.order_number,
    createdAt: iso(o.created_at),
    status: o.status,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    total: withPersonal ? o.total : 0,
    firstName: withPersonal ? String(o.customer_name).split(' ')[0] : '',
    city: withPersonal ? o.city : '',
    pincode: withPersonal ? o.pincode : '',
    items: withPersonal ? items.map((i) => ({ name: i.name, quantity: i.quantity })) : [],
    courierName: o.courier_name,
    awbCode: o.awb_code,
    trackingUrl: o.tracking_url,
    shippingStatus: o.shipping_status,
    etd: o.tracking_etd || null,
    activities: Array.isArray(o.tracking_activities) ? o.tracking_activities : [],
    lastSynced: isoOrNull(o.last_tracking_sync),
    events: withPersonal ? events.map((e) => ({ message: e.message, createdAt: iso(e.created_at) })) : []
  };
}

async function publicEvents(orderId: string) {
  return db()`
    SELECT message, created_at FROM order_events
    WHERE order_id = ${orderId} AND kind IN ('STATUS','SHIPPING') AND actor IN ('system','customer','courier','razorpay')
    ORDER BY created_at DESC LIMIT 20
  `;
}

/** Tracking by order number + phone: full (but address-free) view with live courier scans. */
export async function trackOrder(orderNumber: string, phone: string): Promise<PublicTracking | null> {
  const sql = db();
  const ref = orderNumber.trim().toUpperCase().replace(/^#/, '');
  const normalized = /^[0-9]+$/.test(ref) ? `RPS-${ref}` : ref;
  let [o] = await sql`SELECT * FROM orders WHERE order_number = ${normalized} AND customer_phone = ${normalisePhone(phone)}`;
  if (!o) return null;
  o = await refreshCourierTracking(o);
  const items = await sql`SELECT name, quantity FROM order_items WHERE order_id = ${o.id}`;
  return publicTracking(o, items, await publicEvents(o.id), true);
}

/** Tracking by courier AWB only: shipment status and scans, no personal details. */
export async function trackByAwb(awbRaw: string): Promise<PublicTracking | null> {
  const awb = awbRaw.trim().toUpperCase();
  let [o] = await db()`SELECT * FROM orders WHERE upper(awb_code) = ${awb}`;
  if (!o) return null;
  o = await refreshCourierTracking(o);
  return publicTracking(o, [], [], false);
}

// ---------------------------------------------------------------- analytics

export async function getAnalytics(days: number) {
  const sql = db();
  const since = sql`created_at >= now() - make_interval(days => ${days})`;
  const active = sql`status NOT IN ('CANCELLED','REFUNDED','PENDING_PAYMENT','RTO')`;

  const [k] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE ${active})::int AS orders,
      COALESCE(SUM(total) FILTER (WHERE ${active}), 0)::int AS revenue,
      COALESCE(SUM(discount) FILTER (WHERE ${active}), 0)::int AS discounts,
      COALESCE(SUM(shipping_fee + cod_fee) FILTER (WHERE ${active}), 0)::int AS shipping_collected,
      COALESCE(SUM(shipping_cost) FILTER (WHERE ${active}), 0)::int AS shipping_cost,
      COUNT(*) FILTER (WHERE ${active} AND shipping_cost IS NULL)::int AS missing_shipping_cost,
      COALESCE(SUM(total) FILTER (WHERE ${active} AND payment_method = 'COD' AND status <> 'DELIVERED'), 0)::int AS cod_pending,
      COALESCE(SUM(total) FILTER (WHERE ${active} AND payment_method = 'COD' AND status = 'DELIVERED'), 0)::int AS cod_collected,
      COALESCE(SUM(total) FILTER (WHERE ${active} AND payment_method <> 'COD' AND payment_status = 'PAID'), 0)::int AS prepaid_paid,
      COALESCE(SUM(total) FILTER (WHERE payment_status = 'AWAITING_VERIFICATION'), 0)::int AS awaiting_verification,
      COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled,
      COUNT(*) FILTER (WHERE status = 'RTO')::int AS rto,
      COUNT(*) FILTER (WHERE status = 'REFUNDED')::int AS refunded,
      COALESCE(SUM(total) FILTER (WHERE status IN ('CANCELLED','REFUNDED','RTO')), 0)::int AS lost_value
    FROM orders WHERE ${since}
  `;
  const [cogs] = await sql`
    SELECT COALESCE(SUM(oi.cost_price * oi.quantity), 0)::int AS cogs
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= now() - make_interval(days => ${days})
      AND o.status NOT IN ('CANCELLED','REFUNDED','PENDING_PAYMENT','RTO')
  `;
  const daily = await sql`
    SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS day,
           COUNT(*)::int AS orders, COALESCE(SUM(total), 0)::int AS revenue
    FROM orders WHERE ${since} AND ${active}
    GROUP BY 1 ORDER BY 1
  `;
  const top = await sql`
    SELECT oi.name, SUM(oi.quantity)::int AS units, SUM(oi.line_total)::int AS revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= now() - make_interval(days => ${days})
      AND o.status NOT IN ('CANCELLED','REFUNDED','PENDING_PAYMENT','RTO')
    GROUP BY oi.name ORDER BY units DESC LIMIT 8
  `;
  const statusCounts = await sql`SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status`;
  const lowStock = await sql`SELECT id, name, sku, stock FROM products WHERE is_active AND stock <= 5 ORDER BY stock ASC LIMIT 20`;

  // Payment-gateway / GST etc. are not deducted; shipping cost uses what the admin recorded or Shiprocket reported.
  const productRevenue = k.revenue - k.shipping_collected;
  const netProfit = productRevenue - cogs.cogs + k.shipping_collected - k.shipping_cost;
  return {
    days,
    orders: k.orders,
    revenue: k.revenue,
    productRevenue,
    cogs: cogs.cogs,
    discounts: k.discounts,
    shippingCollected: k.shipping_collected,
    shippingCost: k.shipping_cost,
    missingShippingCost: k.missing_shipping_cost,
    netProfit,
    marginPercent: k.revenue > 0 ? Math.round((netProfit / k.revenue) * 100) : 0,
    codPending: k.cod_pending,
    codCollected: k.cod_collected,
    prepaidPaid: k.prepaid_paid,
    awaitingVerification: k.awaiting_verification,
    cancelled: k.cancelled,
    rto: k.rto,
    refunded: k.refunded,
    lostValue: k.lost_value,
    daily: daily.map((d) => ({ day: d.day as string, orders: d.orders as number, revenue: d.revenue as number })),
    topProducts: top.map((t) => ({ name: t.name as string, units: t.units as number, revenue: t.revenue as number })),
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s.count])) as Record<string, number>,
    lowStock: lowStock.map((p) => ({ id: p.id as string, name: p.name as string, sku: p.sku as string, stock: p.stock as number }))
  };
}
