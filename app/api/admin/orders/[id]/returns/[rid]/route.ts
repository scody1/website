import { requireAdmin } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';
import { resolveReturnRequest, returnDecisionSchema } from '@/lib/server/orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string; rid: string } };

/** Approve / reject / complete a customer's return request. */
export const POST = route<Ctx>(async (req, { params }) => {
  const user = await requireAdmin(req, 'orders.status');
  const input = await readJson(req, returnDecisionSchema);
  return json({ order: await resolveReturnRequest(params.id, params.rid, input, user.email) });
});
