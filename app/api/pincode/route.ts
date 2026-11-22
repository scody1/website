import { NextRequest } from 'next/server';
import { clientIp, json, route } from '@/lib/server/http';
import { checkPincode } from '@/lib/server/pincode';
import { rateLimit } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  await rateLimit(`pincode:${clientIp(req)}`, 40, 60);
  const pin = req.nextUrl.searchParams.get('pin') || '';
  return json({ result: await checkPincode(pin) });
});
