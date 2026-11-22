import { requireAdmin } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';
import { categoryInputSchema, deleteCategory, upsertCategory } from '@/lib/server/catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

export const PUT = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req, 'categories.manage');
  const input = await readJson(req, categoryInputSchema);
  return json({ category: await upsertCategory(params.id, input) });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req, 'categories.manage');
  await deleteCategory(params.id);
  return json({ ok: true });
});
