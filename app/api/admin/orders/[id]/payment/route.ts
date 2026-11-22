import { z } from 'zod';
import { requireAdmin } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';
import { getOrder, verifyUpiPayment } from '@/lib/server/orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string } };
const schema = z.object({ approve: z.boolean(), note: z.string().trim().max(500).default('') });

/** Approve or reject a manual UPI payment after checking the UTR in the bank/UPI app. */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireAdmin(req, 'payments.verify');
  const { approve, note } = await readJson(req, schema);
  await verifyUpiPayment(params.id, approve, note, user.email);
  return json({ order: await getOrder(params.id) });
});
