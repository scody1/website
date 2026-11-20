import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  try {
    const isAuthenticated = verifyAdminRequest(req);
    return NextResponse.json({ authenticated: isAuthenticated });
  } catch (err: unknown) {
    return NextResponse.json({ authenticated: false });
  }
}
