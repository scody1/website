import { NextRequest } from 'next/server';
import { ApiError, json, readJson, route } from '@/lib/server/http';
import { currentCustomer, customerCancelOrRefundOrder } from '@/lib/server/customerAuth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const cancelSchema = z.object({
  reason: z.string().trim().min(2, 'Please provide a valid reason.'),
  upiId: z.string().trim().optional()
});

export const POST = route(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const customer = await currentCustomer(req);
  if (!customer) throw new ApiError(401, 'Please sign in to manage your order.');

  const input = await readJson(req, cancelSchema);
  const result = await customerCancelOrRefundOrder(
    customer.id,
    customer.phone,
    params.id,
    input.reason,
    input.upiId
  );

  return json(result);
});
