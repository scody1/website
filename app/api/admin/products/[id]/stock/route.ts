import { z } from 'zod';
import { requireAdmin } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { ApiError, json, readJson, route } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

/** Stock-only update (for roles that may change quantities but not prices). */
export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req, 'products.stock');
  const { stock } = await readJson(req, z.object({ stock: z.coerce.number().int().min(0).max(1_000_000) }));
  const [row] = await db()`UPDATE products SET stock = ${stock}, updated_at = now() WHERE id = ${params.id} RETURNING id, stock`;
  if (!row) throw new ApiError(404, 'Product not found.');
  return json({ id: row.id, stock: row.stock });
});
