import { NextRequest } from 'next/server';
import { z } from 'zod';
import { assertSameOrigin, json, readJson, route } from '@/lib/server/http';
import { getWishlist, requireCustomer, setWishlisted } from '@/lib/server/customerAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  const customer = await requireCustomer(req);
  return json({ productIds: await getWishlist(customer.id) });
});

const schema = z.object({ productIds: z.array(z.string().uuid()).min(1).max(200), on: z.boolean() });

/** Add (on=true) or remove (on=false) products; also used to merge a guest wishlist after sign-in. */
export const POST = route(async (req: NextRequest) => {
  assertSameOrigin(req);
  const customer = await requireCustomer(req);
  const { productIds, on } = await readJson(req, schema);
  return json({ productIds: await setWishlisted(customer.id, productIds, on) });
});
