import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { db, iso, num } from './db';
import { ApiError, clientIp, isHttps } from './http';
import { rateLimit, resetRateLimit } from './rateLimit';
import { dummyPasswordHash, hashPassword, verifyPassword } from './crypto';
import { addEvent } from './orders';
import { cancelOrder, CUSTOMER_CANCELLABLE } from './cancellation';
import type { CustomerOrderItem, CustomerOrderSummary, CustomerProfile, OrderStatus, PaymentMethod, PaymentStatus } from '../shared/types';

// Customer accounts (shoppers). Separate from admin accounts.
//
// SECURITY NOTE: phone numbers are NOT verified by OTP (that needs a paid SMS provider),
// so an account must never get access to orders just because the phone number matches.
// Orders are linked to an account only when they are placed while signed in, or when the
// customer explicitly claims a past order with its order number (proof of purchase).

export const CUSTOMER_COOKIE = 'rps_customer_session';
const SESSION_DAYS = 30;
const sha256hex = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function mapCustomer(r: Row): CustomerProfile {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email || '',
    addressLine1: r.address_line1 || '',
    addressLine2: r.address_line2 || '',
    city: r.city || '',
    state: r.state || '',
    pincode: r.pincode || '',
    createdAt: iso(r.created_at)
  };
}

export function cleanIndianPhone(raw: string): string {
  let p = raw.replace(/\D/g, '');
  if (p.length === 12 && p.startsWith('91')) p = p.slice(2);
  if (p.length === 11 && p.startsWith('0')) p = p.slice(1);
  return p;
}

export function customerPasswordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Password must contain both letters and numbers.';
  return null;
}

// ---------------------------------------------------------------- sessions

async function createCustomerSession(req: NextRequest, customerId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  const sql = db();
  await sql`DELETE FROM customer_sessions WHERE expires_at < now() - interval '7 days'`;
  await sql`
    INSERT INTO customer_sessions (token_hash, customer_id, ip, user_agent, expires_at)
    VALUES (${sha256hex(token)}, ${customerId}, ${clientIp(req)}, ${(req.headers.get('user-agent') || '').slice(0, 300)},
            now() + make_interval(days => ${SESSION_DAYS}))
  `;
  await sql`UPDATE customers SET last_login_at = now() WHERE id = ${customerId}`;
  return token;
}

export function setCustomerCookie(req: NextRequest, res: NextResponse, token: string) {
  res.cookies.set({
    name: CUSTOMER_COOKIE,
    value: token,
    httpOnly: true,
    secure: isHttps(req),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60
  });
}

export function clearCustomerCookie(req: NextRequest, res: NextResponse) {
  res.cookies.set({ name: CUSTOMER_COOKIE, value: '', httpOnly: true, secure: isHttps(req), sameSite: 'lax', path: '/', maxAge: 0 });
}

// ---------------------------------------------------------------- registration & login

export interface RegisterInput {
  name: string;
  phone: string;
  email?: string;
  password: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export async function registerCustomer(req: NextRequest, input: RegisterInput): Promise<{ token: string; customer: CustomerProfile }> {
  const name = input.name.trim();
  if (name.length < 2) throw new ApiError(400, 'Please enter your full name (at least 2 characters).');
  const phone = cleanIndianPhone(input.phone);
  if (!/^[6-9][0-9]{9}$/.test(phone)) throw new ApiError(400, 'Please enter a valid 10-digit Indian mobile number.');
  const email = (input.email || '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Please enter a valid email address.');
  const pwProblem = customerPasswordProblem(input.password);
  if (pwProblem) throw new ApiError(400, pwProblem);
  const pincode = (input.pincode || '').trim();
  if (pincode && !/^[1-9][0-9]{5}$/.test(pincode)) throw new ApiError(400, 'Please enter a valid 6-digit pincode.');

  await rateLimit(`customer-reg:${clientIp(req)}`, 5, 30 * 60, 'Too many registration attempts. Please try again later.');

  const sql = db();
  if ((await sql`SELECT 1 FROM customers WHERE phone = ${phone}`).length) {
    throw new ApiError(409, 'An account with this mobile number already exists. Please sign in instead.');
  }
  if (email && (await sql`SELECT 1 FROM customers WHERE email = ${email}`).length) {
    throw new ApiError(409, 'An account with this email already exists. Please sign in instead.');
  }

  const [row] = await sql`
    INSERT INTO customers (name, phone, email, password_hash, address_line1, address_line2, city, state, pincode)
    VALUES (${name}, ${phone}, ${email || null}, ${await hashPassword(input.password)},
            ${(input.addressLine1 || '').trim()}, ${(input.addressLine2 || '').trim()}, ${(input.city || '').trim()},
            ${(input.state || '').trim()}, ${pincode})
    RETURNING *
  `;
  // Past guest orders are NOT linked automatically (the phone number is not verified).
  // The customer can claim them with the order number from their confirmation.
  const customer = mapCustomer(row);
  return { token: await createCustomerSession(req, customer.id), customer };
}

export async function loginCustomer(req: NextRequest, identifierRaw: string, password: string): Promise<{ token: string; customer: CustomerProfile }> {
  const idRaw = identifierRaw.trim();
  const isEmail = idRaw.includes('@');
  const key = isEmail ? idRaw.toLowerCase() : cleanIndianPhone(idRaw);
  const ip = clientIp(req);
  await rateLimit(`customer-login:${ip}`, 10, 15 * 60, 'Too many login attempts. Please wait 15 minutes.');
  await rateLimit(`customer-login-id:${key}`, 8, 15 * 60, 'Too many attempts for this account. Please wait 15 minutes.');

  const sql = db();
  const [row] = isEmail
    ? await sql`SELECT * FROM customers WHERE email = ${key} AND is_active`
    : await sql`SELECT * FROM customers WHERE phone = ${key} AND is_active`;
  const ok = row ? await verifyPassword(password, row.password_hash) : (await verifyPassword(password, await dummyPasswordHash()), false);
  if (!row || !ok) throw new ApiError(401, 'Incorrect mobile number/email or password.');

  await resetRateLimit(`customer-login:${ip}`);
  await resetRateLimit(`customer-login-id:${key}`);
  const customer = mapCustomer(row);
  return { token: await createCustomerSession(req, customer.id), customer };
}

export async function logoutCustomer(token?: string) {
  if (!token) return;
  await db()`UPDATE customer_sessions SET revoked_at = now() WHERE token_hash = ${sha256hex(token)}`;
}

export async function changeCustomerPassword(req: NextRequest, customerId: string, current: string, next: string) {
  const sql = db();
  const [row] = await sql`SELECT password_hash FROM customers WHERE id = ${customerId}`;
  if (!row || !(await verifyPassword(current, row.password_hash))) throw new ApiError(400, 'Your current password is incorrect.');
  const problem = customerPasswordProblem(next);
  if (problem) throw new ApiError(400, problem);
  await sql`UPDATE customers SET password_hash = ${await hashPassword(next)}, updated_at = now() WHERE id = ${customerId}`;
  const keep = req.cookies.get(CUSTOMER_COOKIE)?.value;
  await sql`
    UPDATE customer_sessions SET revoked_at = now()
    WHERE customer_id = ${customerId} AND revoked_at IS NULL AND token_hash <> ${keep ? sha256hex(keep) : ''}
  `;
}

// ---------------------------------------------------------------- session resolution

export async function customerFromToken(token: string | undefined): Promise<CustomerProfile | null> {
  if (!token || token.length < 20) return null;
  const [row] = await db()`
    SELECT c.* FROM customer_sessions s JOIN customers c ON c.id = s.customer_id
    WHERE s.token_hash = ${sha256hex(token)} AND s.revoked_at IS NULL AND s.expires_at > now() AND c.is_active
  `;
  return row ? mapCustomer(row) : null;
}

export async function currentCustomer(req?: NextRequest): Promise<CustomerProfile | null> {
  try {
    const token = req ? req.cookies.get(CUSTOMER_COOKIE)?.value : cookies().get(CUSTOMER_COOKIE)?.value;
    return await customerFromToken(token);
  } catch {
    return null;
  }
}

export async function requireCustomer(req: NextRequest): Promise<CustomerProfile> {
  const c = await currentCustomer(req);
  if (!c) throw new ApiError(401, 'Please sign in to continue.');
  return c;
}

// ---------------------------------------------------------------- profile

export async function updateCustomerProfile(
  customerId: string,
  input: { name?: string; email?: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string; pincode?: string }
): Promise<CustomerProfile> {
  const sql = db();
  const [cur] = await sql`SELECT * FROM customers WHERE id = ${customerId}`;
  if (!cur) throw new ApiError(404, 'Customer account not found.');
  const name = input.name !== undefined ? input.name.trim() : cur.name;
  if (name.length < 2) throw new ApiError(400, 'Name must be at least 2 characters.');
  let email = cur.email;
  if (input.email !== undefined) {
    const e = input.email.trim().toLowerCase();
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new ApiError(400, 'Invalid email address format.');
    if (e && e !== cur.email && (await sql`SELECT 1 FROM customers WHERE email = ${e} AND id <> ${customerId}`).length) {
      throw new ApiError(409, 'That email is already registered to another account.');
    }
    email = e || null;
  }
  const pincode = input.pincode !== undefined ? input.pincode.trim() : cur.pincode;
  if (pincode && !/^[1-9][0-9]{5}$/.test(pincode)) throw new ApiError(400, 'Please enter a valid 6-digit pincode.');
  const [row] = await sql`
    UPDATE customers SET
      name = ${name}, email = ${email},
      address_line1 = ${input.addressLine1 !== undefined ? input.addressLine1.trim() : cur.address_line1},
      address_line2 = ${input.addressLine2 !== undefined ? input.addressLine2.trim() : cur.address_line2},
      city = ${input.city !== undefined ? input.city.trim() : cur.city},
      state = ${input.state !== undefined ? input.state.trim() : cur.state},
      pincode = ${pincode}, updated_at = now()
    WHERE id = ${customerId} RETURNING *
  `;
  return mapCustomer(row);
}

// ---------------------------------------------------------------- orders

/** Only orders that belong to this account (placed while signed in, or claimed). */
export async function getCustomerOrders(customerId: string): Promise<CustomerOrderSummary[]> {
  const sql = db();
  const orders = await sql`
    SELECT id, order_number, total, subtotal, discount, shipping_fee, cod_fee, payment_method, payment_status, status,
           tracking_url, awb_code, courier_name, cancel_reason, refund_amount, created_at
    FROM orders WHERE customer_id = ${customerId} ORDER BY created_at DESC LIMIT 200
  `;
  if (orders.length === 0) return [];
  const ids = orders.map((o) => o.id);
  const items = await sql`
    SELECT id, order_id, product_id, name, image_url, unit_price, quantity, line_total
    FROM order_items WHERE order_id = ANY(${ids}::uuid[]) ORDER BY name
  `;
  const returns = await sql`
    SELECT DISTINCT ON (order_id) order_id, status, admin_note, created_at
    FROM return_requests WHERE order_id = ANY(${ids}::uuid[]) ORDER BY order_id, created_at DESC
  `;
  const retByOrder = new Map(returns.map((r) => [r.order_id as string, r]));
  const itemsByOrder = new Map<string, CustomerOrderItem[]>();
  for (const it of items) {
    const list = itemsByOrder.get(it.order_id) || [];
    list.push({
      id: it.id, productId: it.product_id, name: it.name, imageUrl: it.image_url || '',
      unitPrice: num(it.unit_price), quantity: num(it.quantity), lineTotal: num(it.line_total)
    });
    itemsByOrder.set(it.order_id, list);
  }
  return orders.map((o) => {
    const ret = retByOrder.get(o.id);
    const refunded = o.refund_amount ? num(o.refund_amount) : 0;
    return {
      id: o.id,
      orderNumber: o.order_number,
      total: num(o.total),
      subtotal: num(o.subtotal),
      discount: num(o.discount),
      shippingFee: num(o.shipping_fee),
      codFee: num(o.cod_fee),
      paymentMethod: o.payment_method as PaymentMethod,
      paymentStatus: o.payment_status as PaymentStatus,
      status: o.status as OrderStatus,
      trackingUrl: o.tracking_url,
      awbCode: o.awb_code,
      courierName: o.courier_name,
      cancelReason: o.cancel_reason || null,
      refundNotes: null, // internal refund notes are not shown to customers
      refundAmount: refunded || null,
      refundDue: o.status === 'CANCELLED' && o.payment_status === 'PAID' && refunded < num(o.total),
      canCancel: CUSTOMER_CANCELLABLE.includes(o.status as OrderStatus) && !o.awb_code,
      canRequestReturn: ['READY_TO_SHIP', 'PICKUP_SCHEDULED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status) && (!ret || ret.status === 'REJECTED'),
      returnRequest: ret ? { status: ret.status, adminNote: ret.admin_note || '', createdAt: iso(ret.created_at) } : null,
      createdAt: iso(o.created_at),
      items: itemsByOrder.get(o.id) || []
    };
  });
}

/**
 * Links a past guest order to the account. Requires the order number (from the
 * customer's confirmation), the delivery pincode, AND the order's phone must equal the account phone.
 * (Order numbers are sequential, so the pincode is a second secret the real customer knows.)
 */
export async function claimOrder(req: NextRequest, customer: CustomerProfile, orderNumberRaw: string, pincode: string) {
  await rateLimit(`claim:${customer.id}`, 10, 60 * 60, 'Too many attempts. Please try again later.');
  const ref = orderNumberRaw.trim().toUpperCase().replace(/^#/, '');
  const orderNumber = /^[0-9]+$/.test(ref) ? `RPS-${ref}` : ref;
  const sql = db();
  const res = await sql`
    UPDATE orders SET customer_id = ${customer.id}
    WHERE order_number = ${orderNumber} AND customer_phone = ${customer.phone} AND pincode = ${pincode} AND customer_id IS NULL
    RETURNING id
  `;
  if (res.length === 0) {
    throw new ApiError(404, 'No unclaimed order matches that order number, delivery pincode and your mobile number.');
  }
  await addEvent(sql, res[0].id, 'NOTE', `Order linked to customer account ${customer.phone}.`, 'customer');
}

async function ownedOrder(customerId: string, orderId: string) {
  const [o] = await db()`SELECT * FROM orders WHERE id = ${orderId} AND customer_id = ${customerId}`;
  if (!o) throw new ApiError(404, 'Order not found in your account.');
  return o;
}

/** Customer cancels before dispatch → shared cancellation flow (automatic Razorpay refund). */
export async function customerCancelOrder(customer: CustomerProfile, orderId: string, reason: string, refundUpi?: string) {
  const o = await ownedOrder(customer.id, orderId);
  const result = await cancelOrder(o.id, { reason: `Customer: ${reason}`, actor: 'customer', by: 'customer', refundUpi });
  const total = Number(o.total);
  const message =
    result.refund === 'razorpay'
      ? `Order #${o.order_number} is cancelled. A refund of ₹${result.refundAmount} has been sent to your original payment method (it usually shows in 5–7 working days).`
      : result.refund === 'manual_due'
        ? `Order #${o.order_number} is cancelled. Your refund of ₹${result.refundAmount} will be sent by the store${refundUpi ? ` to ${refundUpi}` : ''} within 1–2 working days.`
        : result.refund === 'failed'
          ? `Order #${o.order_number} is cancelled. Your refund of ₹${total} could not be sent automatically — the store has been alerted and will process it shortly.`
          : result.refund === 'verify_first'
            ? `Order #${o.order_number} is cancelled. If your UPI payment went through, the store will verify it and refund you.`
            : `Order #${o.order_number} is cancelled.`;
  return { success: true, action: 'cancelled' as const, refund: result.refund, message };
}

/** After dispatch: a return/refund request the admin reviews (no money moves automatically). */
export async function customerRequestReturn(customer: CustomerProfile, orderId: string, reason: string, refundUpi?: string) {
  const o = await ownedOrder(customer.id, orderId);
  if (!['READY_TO_SHIP', 'PICKUP_SCHEDULED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status)) {
    throw new ApiError(400, CUSTOMER_CANCELLABLE.includes(o.status) ? 'This order has not shipped yet — you can cancel it instead.' : 'A return cannot be requested for this order.');
  }
  const sql = db();
  try {
    await sql`
      INSERT INTO return_requests (order_id, customer_id, reason, refund_upi)
      VALUES (${o.id}, ${customer.id}, ${reason}, ${(refundUpi || '').trim()})
    `;
  } catch (err) {
    if ((err as { code?: string }).code === '23505') throw new ApiError(409, 'You already have an open return request for this order.');
    throw err;
  }
  await addEvent(sql, o.id, 'WARNING', `Customer requested a return/refund: ${reason}${refundUpi ? ` (refund UPI: ${refundUpi})` : ''}.`, 'customer');
  return {
    success: true,
    action: 'refund_requested' as const,
    refund: 'none' as const,
    message: `Return request received for Order #${o.order_number}. Our team will review it and contact you on WhatsApp/phone.`
  };
}

// ---------------------------------------------------------------- wishlist

export async function getWishlist(customerId: string): Promise<string[]> {
  const rows = await db()<{ product_id: string }[]>`
    SELECT w.product_id FROM customer_wishlist w JOIN products p ON p.id = w.product_id
    WHERE w.customer_id = ${customerId} AND p.is_active ORDER BY w.created_at DESC
  `;
  return rows.map((r) => r.product_id);
}

export async function setWishlisted(customerId: string, productIds: string[], on: boolean) {
  const sql = db();
  if (on) {
    for (const pid of productIds.slice(0, 200)) {
      await sql`
        INSERT INTO customer_wishlist (customer_id, product_id)
        SELECT ${customerId}, id FROM products WHERE id = ${pid}
        ON CONFLICT DO NOTHING
      `;
    }
  } else {
    await sql`DELETE FROM customer_wishlist WHERE customer_id = ${customerId} AND product_id = ANY(${productIds}::uuid[])`;
  }
  return getWishlist(customerId);
}
