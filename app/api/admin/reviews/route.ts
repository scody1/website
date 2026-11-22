import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { json, route } from '@/lib/server/http';
import { listAdminReviews } from '@/lib/server/catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req, 'reviews.view');
  return json({ reviews: await listAdminReviews() });
});
