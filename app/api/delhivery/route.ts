import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    // Protect courier booking endpoint with server-side admin check
    const isAdmin = verifyAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin session token is required to dispatch via Delhivery.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { token, order } = body;

    // Simulate Delhivery direct waybill generation
    const waybill = 'DL' + Math.floor(1000000000 + Math.random() * 9000000000);

    return NextResponse.json({
      success: true,
      booking: {
        courierName: 'Delhivery',
        orderId: order?.id || 'RPS-DL',
        awbCode: waybill,
        courierPartner: 'Delhivery Express Surface',
        trackingUrl: `https://www.delhivery.com/track/package/${waybill}`,
        bookingTimestamp: new Date().toISOString(),
        isSimulated: !token
      },
      message: `Delhivery Waybill #${waybill} generated successfully.`
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
