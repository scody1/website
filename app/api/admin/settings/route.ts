import { NextRequest } from 'next/server';
import { z } from 'zod';
import { audit, requireAdmin } from '@/lib/server/auth';
import { json, readJson, route } from '@/lib/server/http';
import { getAllSettings, updateSettingsSection } from '@/lib/server/settings';
import type { Permission } from '@/lib/shared/roles';
import type { SettingsSection } from '@/lib/shared/types';
import { ApiError } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Any signed-in admin can read settings (the UI needs the store name etc.). */
export const GET = route(async (req: NextRequest) => {
  const user = await requireAdmin(req);
  const settings = await getAllSettings();
  // PAN is visible only to roles that manage settings.
  if (!user.permissions.includes('settings.pickup')) settings.business.pan = '';
  return json({ settings });
});

/** Which permission(s) allow editing each settings section. */
const SECTION_PERMISSIONS: Record<SettingsSection, Permission[]> = {
  store: ['settings.store'],
  business: ['settings.pickup', 'shipping.setup'],
  payments: ['settings.payments'],
  seo: ['settings.seo'],
  policies: ['settings.seo']
};

const schema = z.object({
  section: z.enum(['store', 'business', 'payments', 'seo', 'policies']),
  value: z.record(z.unknown())
});

export const PUT = route(async (req: NextRequest) => {
  const user = await requireAdmin(req);
  const { section, value } = await readJson(req, schema);
  const allowed = SECTION_PERMISSIONS[section].some((p) => user.permissions.includes(p));
  if (!allowed) throw new ApiError(403, 'Your role cannot change these settings.');
  const saved = await updateSettingsSection(section, value);
  await audit(user, 'settings.update', section, req);
  return json({ value: saved });
});
