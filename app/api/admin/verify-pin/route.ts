import { NextRequest, NextResponse } from 'next/server';
import { createAdminSessionToken } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin } = body;

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Passcode is required.' },
        { status: 400 }
      );
    }

    const expectedPin = process.env.ADMIN_PASSCODE || '1234';

    // Verify passcode
    if (pin.trim() !== expectedPin.trim()) {
      return NextResponse.json(
        { success: false, message: 'Incorrect Admin Passcode. Please try again.' },
        { status: 401 }
      );
    }

    // Generate signed token
    const token = createAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      token,
      message: 'Admin authorization successful.'
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: 'admin_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, message: `Server error: ${msg}` },
      { status: 500 }
    );
  }
}
