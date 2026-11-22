import type { MetadataRoute } from 'next';
import { db, isDbConfigured } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

/** /sitemap.xml — home page plus every live product page. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const entries: MetadataRoute.Sitemap = [{ url: `${site}/`, changeFrequency: 'daily', priority: 1 }];
  if (!isDbConfigured()) return entries;
  try {
    const rows = await db()<{ slug: string; updated_at: Date }[]>`SELECT slug, updated_at FROM products WHERE is_active ORDER BY updated_at DESC`;
    for (const r of rows) entries.push({ url: `${site}/product/${r.slug}`, lastModified: r.updated_at, changeFrequency: 'weekly', priority: 0.8 });
  } catch {
    /* database unavailable — return the home page only */
  }
  return entries;
}
