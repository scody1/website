import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError, ZodTypeAny } from 'zod';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/** Wraps a route handler with consistent JSON error handling. */
export function route<C = { params: Record<string, string> }>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const field = first?.path?.length ? `${first.path.join('.')}: ` : '';
    return NextResponse.json({ error: `${field}${first?.message || 'Invalid input'}`, issues: err.issues }, { status: 400 });
  }
  const pgCode = (err as { code?: string })?.code;
  if (pgCode === '23505') {
    const detail = (err as { detail?: string }).detail || '';
    return NextResponse.json({ error: `This value already exists. ${detail}`.trim() }, { status: 409 });
  }
  if (pgCode === '23503') {
    return NextResponse.json({ error: 'This record is still referenced by other data.' }, { status: 409 });
  }
  if (pgCode === '23514') {
    return NextResponse.json({ error: 'A value is outside the allowed range.' }, { status: 400 });
  }
  console.error('[api] unexpected error', err);
  return NextResponse.json({ error: 'Something went wrong on our side. Please try again.' }, { status: 500 });
}

export async function readJson<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.');
  }
  return schema.parse(body);
}

/**
 * Client IP for rate limiting. Prefers headers set by the hosting platform
 * (Vercel / reverse proxy) over the client-controllable X-Forwarded-For.
 */
export function clientIp(req: NextRequest): string {
  const platform = req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-real-ip');
  if (platform) return platform.split(',')[0].trim();
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.ip || 'unknown';
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/** Origin of the site, used to build absolute URLs (webhooks, emails). */
export function siteOrigin(req: NextRequest): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}

/**
 * True when the browser reached us over HTTPS. Used for the cookie `Secure` flag:
 * marking cookies Secure on a plain-http site (e.g. testing on a LAN IP) makes the
 * browser silently drop them, which looks like "login does not work".
 */
export function isHttps(req: NextRequest): boolean {
  const fwd = req.headers.get('x-forwarded-proto');
  if (fwd) return fwd.split(',')[0].trim() === 'https';
  return req.nextUrl.protocol === 'https:';
}

/** Blocks cross-site form/fetch posts (CSRF defence for cookie-authenticated routes). */
export function assertSameOrigin(req: NextRequest) {
  if (req.method === 'GET' || req.method === 'HEAD') return;
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!origin || !host) return;
  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch {
    /* ignore */
  }
  if (originHost !== host) throw new ApiError(403, 'Cross-site request blocked.');
}
