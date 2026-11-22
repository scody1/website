import { z } from 'zod';
import { requireAdmin } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';
import { deleteReview, moderateReview } from '@/lib/server/catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req, 'reviews.moderate');
  const patch = await readJson(req, z.object({ isApproved: z.boolean().optional(), isVerifiedBuyer: z.boolean().optional() }));
  await moderateReview(params.id, patch);
  return json({ ok: true });
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req, 'reviews.moderate');
  await deleteReview(params.id);
  return json({ ok: true });
});
