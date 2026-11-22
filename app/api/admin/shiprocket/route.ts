import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { json, route } from '@/lib/server/http';
import { shiprocketConfigured, testShiprocket } from '@/lib/server/shiprocket';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** "Test connection": logs in with the saved credentials and lists pickup locations. */
export const POST = route(async (req: NextRequest) => {
  await requireAdmin(req, 'shipping.setup');
  if (!(await shiprocketConfigured())) {
    return json({ ok: false, configured: false, error: 'Shiprocket is not connected yet. A Super Admin must connect it in Admin → Integrations.' });
  }
  const pickupLocations = await testShiprocket();
  return json({ ok: true, configured: true, pickupLocations });
});
