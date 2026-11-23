import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, clientIp, json, readJson, route } from '@/lib/server/http';
import { trackByAwb, trackOrder } from '@/lib/server/orders';
import { rateLimit } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.union([
  z.object({
    orderNumber: z.string().trim().min(3, 'Enter your order number').max(30),
    phone: z.string().trim().min(10, 'Enter the mobile number used at checkout').max(15)
  }),
  z.object({ awb: z.string().trim().min(6, 'Enter the courier AWB / tracking number').max(40) })
]);

/**
 * Customer order tracking with LIVE courier scans from Shiprocket / Delhivery.
 *  - order number + phone → order status, items and courier timeline (no address)
 *  - AWB number           → courier timeline only (no personal details)
 */
export const POST = route(async (req: NextRequest) => {
  await rateLimit(`track:${clientIp(req)}`, 30, 10 * 60);
  const body = await readJson(req, schema);
  const tracking = 'awb' in body ? await trackByAwb(body.awb) : await trackOrder(body.orderNumber, body.phone);
  if (!tracking) {
    throw new ApiError(404, 'awb' in body ? 'No shipment with that tracking number was found.' : 'No order matches that order number and mobile number.');
  }
  return json({ tracking });
});
