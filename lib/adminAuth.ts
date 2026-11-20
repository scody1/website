import crypto from 'crypto';
import { NextRequest } from 'next/server';

const ADMIN_SECRET = process.env.ADMIN_SESSION_SECRET || 'rajeshwar-pooja-samagri-secure-token-secret-2026';

/**
 * Creates a cryptographically signed admin session token valid for 24 hours.
 */
export function createAdminSessionToken(): string {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
  const payload = `admin_${expiresAt}`;
  const hmac = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

/**
 * Verifies if an admin session token is authentic and not expired.
 */
export function verifyAdminSessionToken(token: string | null | undefined): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;

    const [payload, signature] = parts;
    const [prefix, expiresStr] = payload.split('_');
    if (prefix !== 'admin') return false;

    const expiresAt = parseInt(expiresStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return false; // Token expired
    }

    const expectedHmac = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex');
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedHmac, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (err) {
    console.error('Error verifying admin token:', err);
    return false;
  }
}

/**
 * Validates admin authentication from Next.js request headers or HTTP-only cookies.
 */
export function verifyAdminRequest(req: NextRequest): boolean {
  // 1. Check HTTP-only cookie
  const cookieToken = req.cookies.get('admin_session')?.value;
  if (cookieToken && verifyAdminSessionToken(cookieToken)) {
    return true;
  }

  // 2. Check x-admin-token header
  const headerToken = req.headers.get('x-admin-token');
  if (headerToken && verifyAdminSessionToken(headerToken)) {
    return true;
  }

  // 3. Check Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7).trim();
    if (verifyAdminSessionToken(bearerToken)) {
      return true;
    }
  }

  return false;
}
