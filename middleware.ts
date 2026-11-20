import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Inject security headers on /admin pages
  if (pathname.startsWith('/admin')) {
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }

  // Pre-screen unauthenticated requests to protected backend API routes
  if (pathname.startsWith('/api/delhivery')) {
    const sessionCookie = request.cookies.get('admin_session')?.value;
    const adminHeader = request.headers.get('x-admin-token');
    const authHeader = request.headers.get('authorization');
    if (!sessionCookie && !adminHeader && !authHeader) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin session required.' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/delhivery/:path*']
};
