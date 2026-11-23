import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { db, iso, num } from './db';
import { ApiError, clientIp } from './http';
import { rateLimit, resetRateLimit } from './rateLimit';
import { dummyPasswordHash, hashPassword, verifyPassword } from './crypto';
import type { CustomerOrderItem, CustomerOrderSummary, CustomerProfile, OrderStatus, PaymentMethod, PaymentStatus } from '../shared/types';

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

// ---------------------------------------------------------------- session management

async function createCustomerSession(req: NextRequest, customerId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  const sql = db();
  await sql`DELETE FROM customer_sessions WHERE expires_at < now() - interval '7 days'`;
  await sql`
    INSERT INTO customer_sessions (token_hash, customer_id, ip, user_agent, expires_at)
    VALUES (
      ${sha256hex(token)},
      ${customerId},
      ${clientIp(req)},
      ${(req.headers.get('user-agent') || '').slice(0, 300)},
      now() + make_interval(days => ${SESSION_DAYS})
    )
  `;
  await sql`UPDATE customers SET last_login_at = now() WHERE id = ${customerId}`;
  return token;
}

export function setCustomerCookie(res: NextResponse, token: string) {
  res.cookies.set({
    name: CUSTOMER_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60
  });
}

export function clearCustomerCookie(res: NextResponse) {
  res.cookies.set({
    name: CUSTOMER_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
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
  if (!/^[6-9][0-9]{9}$/.test(phone)) {
    throw new ApiError(400, 'Please enter a valid 10-digit Indian mobile number.');
  }

  const email = (input.email || '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'Please enter a valid email address.');
  }

  if (input.password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long.');
  }

  const ip = clientIp(req);
  await rateLimit(`customer-reg:${ip}`, 5, 30 * 60, 'Too many registration attempts. Please try again later.');

  const sql = db();

  // Check existing phone
  const existingPhone = await sql`SELECT id FROM customers WHERE phone = ${phone}`;
  if (existingPhone.length) {
    throw new ApiError(409, 'An account with this mobile number already exists. Please sign in instead.');
  }

  // Check existing email if provided
  if (email) {
    const existingEmail = await sql`SELECT id FROM customers WHERE email = ${email}`;
    if (existingEmail.length) {
      throw new ApiError(409, 'An account with this email already exists. Please sign in instead.');
    }
  }

  const pwHash = await hashPassword(input.password);

  const [row] = await sql`
    INSERT INTO customers (
      name, phone, email, password_hash,
      address_line1, address_line2, city, state, pincode
    ) VALUES (
      ${name},
      ${phone},
      ${email || null},
      ${pwHash},
      ${(input.addressLine1 || '').trim()},
      ${(input.addressLine2 || '').trim()},
      ${(input.city || '').trim()},
      ${(input.state || '').trim()},
      ${(input.pincode || '').trim()}
    ) RETURNING *
  `;

  const customer = mapCustomer(row);

  // Automatically link any past orders placed with this phone number to the new customer
  await sql`UPDATE orders SET customer_id = ${customer.id} WHERE customer_phone = ${phone} AND customer_id IS NULL`;

  const token = await createCustomerSession(req, customer.id);
  return { token, customer };
}

export async function loginCustomer(req: NextRequest, identifierRaw: string, password: string): Promise<{ token: string; customer: CustomerProfile }> {
  const idRaw = identifierRaw.trim();
  const isEmail = idRaw.includes('@');
  const phone = cleanIndianPhone(idRaw);
  const email = idRaw.toLowerCase();

  const ip = clientIp(req);
  await rateLimit(`customer-login:${ip}`, 10, 15 * 60, 'Too many login attempts. Please wait 15 minutes.');

  const sql = db();
  let row: Row | undefined;

  if (isEmail) {
    [row] = await sql`SELECT * FROM customers WHERE email = ${email} AND is_active`;
  } else {
    [row] = await sql`SELECT * FROM customers WHERE phone = ${phone} AND is_active`;
  }

  const ok = row
    ? await verifyPassword(password, row.password_hash)
    : (await verifyPassword(password, await dummyPasswordHash()), false);

  if (!row || !ok) {
    throw new ApiError(401, 'Invalid mobile number/email or password.');
  }

  await resetRateLimit(`customer-login:${ip}`);
  const customer = mapCustomer(row);
  const token = await createCustomerSession(req, customer.id);
  return { token, customer };
}

export async function logoutCustomer(token?: string) {
  if (!token) return;
  await db()`UPDATE customer_sessions SET revoked_at = now() WHERE token_hash = ${sha256hex(token)}`;
}

// ---------------------------------------------------------------- session resolution

export async function customerFromToken(token: string | undefined): Promise<CustomerProfile | null> {
  if (!token || token.length < 20) return null;
  const [row] = await db()`
    SELECT c.*
    FROM customer_sessions s
    JOIN customers c ON c.id = s.customer_id
    WHERE s.token_hash = ${sha256hex(token)}
      AND s.revoked_at IS NULL
      AND s.expires_at > now()
      AND c.is_active
  `;
  return row ? mapCustomer(row) : null;
}

export async function currentCustomer(req?: NextRequest): Promise<CustomerProfile | null> {
  try {
    const token = req
      ? req.cookies.get(CUSTOMER_COOKIE)?.value
      : cookies().get(CUSTOMER_COOKIE)?.value;
    return await customerFromToken(token);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- profile & orders

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
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      throw new ApiError(400, 'Invalid email address format.');
    }
    if (e && e !== cur.email) {
      const dup = await sql`SELECT id FROM customers WHERE email = ${e} AND id <> ${customerId}`;
      if (dup.length) throw new ApiError(409, 'That email is already registered to another account.');
    }
    email = e || null;
  }

  const [row] = await sql`
    UPDATE customers
    SET
      name = ${name},
      email = ${email},
      address_line1 = ${input.addressLine1 !== undefined ? input.addressLine1.trim() : cur.address_line1},
      address_line2 = ${input.addressLine2 !== undefined ? input.addressLine2.trim() : cur.address_line2},
      city = ${input.city !== undefined ? input.city.trim() : cur.city},
      state = ${input.state !== undefined ? input.state.trim() : cur.state},
      pincode = ${input.pincode !== undefined ? input.pincode.trim() : cur.pincode},
      updated_at = now()
    WHERE id = ${customerId}
    RETURNING *
  `;

  return mapCustomer(row);
}

export async function getCustomerOrders(customerId: string, phone: string): Promise<CustomerOrderSummary[]> {
  const sql = db();
  const orders = await sql`
    SELECT
      id, order_number, total, subtotal, discount, shipping_fee, cod_fee,
      payment_method, payment_status, status,
      tracking_url, awb_code, courier_name, created_at
    FROM orders
    WHERE customer_id = ${customerId} OR customer_phone = ${phone}
    ORDER BY created_at DESC
  `;

  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const items = await sql`
    SELECT id, order_id, product_id, name, image_url, unit_price, quantity, line_total
    FROM order_items
    WHERE order_id = ANY(${orderIds})
    ORDER BY id ASC
  `;

  const itemsByOrder = new Map<string, CustomerOrderItem[]>();
  for (const it of items) {
    const list = itemsByOrder.get(it.order_id) || [];
    list.push({
      id: it.id,
      productId: it.product_id,
      name: it.name,
      imageUrl: it.image_url || '',
      unitPrice: num(it.unit_price),
      quantity: num(it.quantity),
      lineTotal: num(it.line_total)
    });
    itemsByOrder.set(it.order_id, list);
  }

  return orders.map((o) => ({
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
    createdAt: iso(o.created_at),
    items: itemsByOrder.get(o.id) || []
  }));
}
