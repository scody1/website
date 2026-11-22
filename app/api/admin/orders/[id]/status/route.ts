import { z } from 'zod';
import { requireAdmin } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { json, readJson, route } from '@/lib/server/http';
import { addEvent, changeOrderStatus, getOrder, getOrderRow } from '@/lib/server/orders';
import { cancelShipment } from '@/lib/server/shipping';
import { sendStatusEmail } from '@/lib/server/email';
import { ALL_ORDER_STATUSES, allowedNextStatuses } from '@/lib/shared/orderStatus';
import type { OrderStatus } from '@/lib/shared/types';
import { ApiError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string } };
const schema = z.object({
  status: z.enum(ALL_ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]),
  note: z.string().trim().max(1000).default('')
});

export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireAdmin(req, 'orders.status');
  const { status, note } = await readJson(req, schema);
  if (status === 'REFUNDED' && !user.permissions.includes('payments.refund')) {
    throw new ApiError(403, 'Your role cannot mark orders as refunded.');
  }
  if (status === 'CANCELLED' && !user.permissions.includes('orders.cancel')) {
    throw new ApiError(403, 'Your role cannot cancel orders.');
  }
  let warning: string | null = null;

  const o = await getOrderRow(db(), params.id);
  if (!allowedNextStatuses(o.status).includes(status)) {
    throw new ApiError(400, 'That status change is not allowed for this order.');
  }
  // Cancelling a booked (not yet picked up) Shiprocket shipment: cancel it there too.
  if (status === 'CANCELLED' && o.sr_order_id) {
    try {
      await cancelShipment(params.id, user.email);
    } catch (err) {
      warning = `Order cancelled here, but Shiprocket cancellation failed: ${(err as Error).message}. Cancel it in the Shiprocket panel.`;
      await addEvent(db(), params.id, 'WARNING', warning, user.email);
    }
  }
  await changeOrderStatus(params.id, status, note, 'admin', user.email);
  await sendStatusEmail(params.id, status, status === 'CANCELLED' ? note : '');
  return json({ order: await getOrder(params.id), warning });
});
