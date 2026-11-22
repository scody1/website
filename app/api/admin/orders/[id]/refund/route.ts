import { requireAdmin } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';
import { refundOrder, refundSchema } from '@/lib/server/orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

/** Full or partial refund. Razorpay payments are refunded through Razorpay automatically. */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireAdmin(req, 'payments.refund');
  const input = await readJson(req, refundSchema);
  return json({ order: await refundOrder(params.id, input, user.email) });
});
