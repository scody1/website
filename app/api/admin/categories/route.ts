import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';
import { categoryInputSchema, listCategories, upsertCategory } from '@/lib/server/catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req, 'products.view');
  return json({ categories: await listCategories(false) });
});

export const POST = route(async (req: NextRequest) => {
  await requireAdmin(req, 'categories.manage');
  const input = await readJson(req, categoryInputSchema);
  return json({ category: await upsertCategory(null, input) }, { status: 201 });
});
