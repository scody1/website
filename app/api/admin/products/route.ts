import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';
import { createProduct, listAdminProducts, productInputSchema } from '@/lib/server/catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  const user = await requireAdmin(req, 'products.view');
  const products = await listAdminProducts();
  const seeCost = user.permissions.includes('products.cost');
  return json({ products: seeCost ? products : products.map((p) => ({ ...p, costPrice: 0 })) });
});

export const POST = route(async (req: NextRequest) => {
  const user = await requireAdmin(req, 'products.create');
  const input = await readJson(req, productInputSchema);
  if (!user.permissions.includes('products.cost')) input.costPrice = 0;
  if (!user.permissions.includes('products.stock')) input.stock = 0;
  return json({ product: await createProduct(input) }, { status: 201 });
});
