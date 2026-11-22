import { z } from 'zod';
import { requireAdmin } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';
import { getOrder } from '@/lib/server/orders';
import { cancelShipment, fetchLabel, fetchSrInvoice, getCourierRates, getDelhiveryQuote, shipWithDelhivery, shipWithShiprocket, syncTracking } from '@/lib/server/shipping';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Ctx = { params: { id: string } };

const pkg = z.object({
  weightKg: z.coerce.number().positive().max(100).optional(),
  lengthCm: z.coerce.number().positive().max(300).optional(),
  breadthCm: z.coerce.number().positive().max(300).optional(),
  heightCm: z.coerce.number().positive().max(300).optional()
});

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('rates'), weightKg: z.coerce.number().positive().max(100).optional() }),
  z.object({
    action: z.literal('ship'),
    courierId: z.coerce.number().int().positive().optional(),
    courierRate: z.coerce.number().int().min(0).optional(),
    package: pkg.optional()
  }),
  z.object({ action: z.literal('dl_quote'), weightKg: z.coerce.number().positive().max(100).optional() }),
  z.object({ action: z.literal('dl_ship'), courierRate: z.coerce.number().int().min(0).optional(), package: pkg.optional() }),
  z.object({ action: z.literal('label') }),
  z.object({ action: z.literal('invoice') }),
  z.object({ action: z.literal('track') }),
  z.object({ action: z.literal('cancel') })
]);

export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireAdmin(req, 'shipping.book');
  const body = await readJson(req, schema);
  const id = params.id;
  switch (body.action) {
    case 'rates':
      return json(await getCourierRates(id, body.weightKg));
    case 'ship':
      return json({ order: await shipWithShiprocket(id, { courierId: body.courierId, courierRate: body.courierRate, package: body.package, by: user.email }) });
    case 'dl_quote':
      return json(await getDelhiveryQuote(id, body.weightKg));
    case 'dl_ship':
      return json({ order: await shipWithDelhivery(id, { courierRate: body.courierRate, package: body.package, by: user.email }) });
    case 'label':
      return json({ url: await fetchLabel(id), order: await getOrder(id) });
    case 'invoice':
      return json({ url: await fetchSrInvoice(id), order: await getOrder(id) });
    case 'track': {
      const tracking = await syncTracking(id);
      return json({ tracking, order: await getOrder(id) });
    }
    case 'cancel':
      await cancelShipment(id, user.email);
      return json({ order: await getOrder(id) });
  }
});
