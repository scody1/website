// Inserts the starter catalogue (categories, products, coupons) and default
// settings. Safe to re-run: existing rows (matched by slug / SKU / code / key) are left untouched.
// Usage: npm run db:seed
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { connectionOptions, loadEnv } from './env.mjs';

loadEnv();
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'db/seed-data.json'), 'utf8'));
const sql = postgres(url, connectionOptions(url));

try {
  await sql.begin(async (tx) => {
    for (const [key, value] of Object.entries({ store: data.store, seo: data.seo, policies: data.policies })) {
      await tx`INSERT INTO settings (key, value) VALUES (${key}, ${tx.json(value)}) ON CONFLICT (key) DO NOTHING`;
    }
    for (const c of data.categories) {
      await tx`
        INSERT INTO categories (name, slug, image_url, description, sort_order)
        VALUES (${c.name}, ${c.slug}, ${c.imageUrl}, ${c.description}, ${c.sortOrder})
        ON CONFLICT (slug) DO NOTHING`;
    }
    const cats = new Map((await tx`SELECT id, name FROM categories`).map((r) => [r.name, r.id]));
    for (const p of data.products) {
      await tx`
        INSERT INTO products (name, slug, sku, category_id, section, selling_price, mrp, cost_price, stock, images, description,
                              benefits, tags, weight_kg, length_cm, breadth_cm, height_cm, is_bestseller)
        VALUES (${p.name}, ${`${p.name}-${p.sku}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)}, ${p.sku}, ${cats.get(p.category) ?? null}, ${p.section}, ${p.sellingPrice}, ${p.mrp}, ${p.costPrice},
                ${p.stock}, ${p.images}, ${p.description}, ${p.benefits}, ${p.tags}, ${p.weightKg}, ${p.lengthCm},
                ${p.breadthCm}, ${p.heightCm}, ${p.isBestseller})
        ON CONFLICT (sku) DO NOTHING`;
    }
    for (const c of data.coupons) {
      await tx`
        INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value)
        VALUES (${c.code}, ${c.description}, ${c.discountType}, ${c.discountValue}, ${c.minOrderValue})
        ON CONFLICT (code) DO NOTHING`;
    }
  });
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM products`;
  console.log(`Seed complete. ${n} product(s) in the catalogue.`);
} catch (err) {
  console.error('Seed failed:', err.message, '\nDid you run `npm run db:migrate` first?');
  process.exitCode = 1;
} finally {
  await sql.end();
}
