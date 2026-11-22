import { requireAdmin } from '@/lib/server/auth';
import { ApiError, json, readJson, route } from '@/lib/server/http';
import { getOrder, orderMetaSchema, updateOrderMeta } from '@/lib/server/orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

export const GET = route<Ctx>(async (req, { params }) => {
  const user = await requireAdmin(req, 'orders.view');
  return json({ order: await getOrder(params.id) });
});

/** Notes, actual shipping cost, or a manually booked shipment (non-Shiprocket courier). */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireAdmin(req, ['orders.notes', 'shipping.book']);
  const patch = await readJson(req, orderMetaSchema);
  if (patch.manualShipment && !user.permissions.includes('shipping.book')) throw new ApiError(403, 'Your role cannot record shipments.');
  if ((patch.adminNotes !== undefined || patch.shippingCost !== undefined) && !user.permissions.includes('orders.notes')) {
    throw new ApiError(403, 'Your role cannot edit order notes.');
  }
  await updateOrderMeta(params.id, patch, user.email);
  return json({ order: await getOrder(params.id) });
});
