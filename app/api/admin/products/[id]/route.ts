import { requireAdmin } from '@/lib/server/auth';
import { db } from '@/lib/server/db';
import { ApiError, json, readJson, route } from '@/lib/server/http';
import { deleteProduct, productInputSchema, updateProduct } from '@/lib/server/catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

export const PUT = route<Ctx>(async (req, { params }) => {
  const user = await requireAdmin(req, 'products.edit');
  const input = await readJson(req, productInputSchema);
  // Fields guarded by their own permissions keep their current values.
  const [cur] = await db()`SELECT cost_price, stock FROM products WHERE id = ${params.id}`;
  if (!cur) throw new ApiError(404, 'Product not found.');
  if (!user.permissions.includes('products.cost')) input.costPrice = cur.cost_price;
  if (!user.permissions.includes('products.stock')) input.stock = cur.stock;
  return json({ product: await updateProduct(params.id, input) });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req, 'products.delete');
  return json(await deleteProduct(params.id));
});
