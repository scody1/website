import { z } from 'zod';
import { requireAdmin } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { ApiError, json, readJson, route } from '@/lib/server/http';
import { changeOrderStatus, getOrder, getOrderRow } from '@/lib/server/orders';
import { cancelOrder } from '@/lib/server/cancellation';
import { sendStatusEmail } from '@/lib/server/email';
import { ALL_ORDER_STATUSES, allowedNextStatuses } from '@/lib/shared/orderStatus';
import type { OrderStatus } from '@/lib/shared/types';

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

  // Cancellation: courier cancel + stock return + AUTOMATIC refund, in one place.
  if (status === 'CANCELLED') {
    const result = await cancelOrder(params.id, { reason: note || 'Cancelled by store', actor: 'admin', by: user.email });
    return json({ order: result.order, refund: result.refund, refundAmount: result.refundAmount, warning: result.warnings.join(' ') || null });
  }

  const o = await getOrderRow(db(), params.id);
  if (!allowedNextStatuses(o.status).includes(status)) {
    throw new ApiError(400, 'That status change is not allowed for this order.');
  }
  await changeOrderStatus(params.id, status, note, 'admin', user.email);
  await sendStatusEmail(params.id, status);
  return json({ order: await getOrder(params.id), warning: null });
});
