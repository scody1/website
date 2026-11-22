import { z } from 'zod';
import { db, iso, num } from './db';
import { ApiError } from './http';
import { getAllSettings } from './settings';
import { razorpayConfigured, razorpayKeyId } from './razorpay';
import type {
  AdminProduct, AdminReview, Category, Coupon, Product, ProductSection, PublicStoreState, Review
} from '../shared/types';
import { PRODUCT_SECTIONS } from '../shared/types';

// ---------------------------------------------------------------- mappers

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function mapCategory(r: Row): Category {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    image: r.image_url,
    description: r.description,
    sortOrder: r.sort_order,
    isActive: r.is_active
  };
}

function mapProduct(r: Row): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    sku: r.sku,
    categoryId: r.category_id,
    category: r.category_name || 'Uncategorised',
    section: r.section as ProductSection,
    sellingPrice: r.selling_price,
    mrp: r.mrp,
    stock: r.stock,
    images: r.images || [],
    description: r.description,
    spiritualBenefits: r.benefits || [],
    tags: r.tags || [],
    rating: r.review_count > 0 ? Math.round(num(r.avg_rating) * 10) / 10 : 0,
    reviewCount: num(r.review_count),
    weightKg: num(r.weight_kg),
    dimensions: { lengthCm: num(r.length_cm), breadthCm: num(r.breadth_cm), heightCm: num(r.height_cm) },
    isBestseller: r.is_bestseller,
    hsnCode: r.hsn_code,
    gstRate: num(r.gst_rate)
  };
}

function mapAdminProduct(r: Row): AdminProduct {
  return { ...mapProduct(r), costPrice: r.cost_price, isActive: r.is_active, createdAt: iso(r.created_at) };
}

function mapReview(r: Row): AdminReview {
  return {
    id: r.id,
    productId: r.product_id,
    productName: r.product_name || null,
    authorName: r.author_name,
    location: r.location,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    date: new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    isVerifiedBuyer: r.is_verified_buyer,
    isApproved: r.is_approved,
    orderNumber: r.order_number || null
  };
}

export function mapCoupon(r: Row): Coupon {
  return {
    id: r.id,
    code: r.code,
    description: r.description,
    discountType: r.discount_type,
    discountValue: r.discount_value,
    maxDiscount: r.max_discount,
    minOrderValue: r.min_order_value,
    usageLimit: r.usage_limit,
    usedCount: r.used_count,
    startsAt: r.starts_at ? iso(r.starts_at) : null,
    expiresAt: r.expires_at ? iso(r.expires_at) : null,
    isActive: r.is_active
  };
}

const PRODUCT_SELECT = (sql: ReturnType<typeof db>) => sql`
  SELECT p.*, c.name AS category_name,
         COALESCE(rv.avg_rating, 0) AS avg_rating, COALESCE(rv.review_count, 0) AS review_count
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN (
    SELECT product_id, AVG(rating) AS avg_rating, COUNT(*)::int AS review_count
    FROM reviews WHERE is_approved GROUP BY product_id
  ) rv ON rv.product_id = p.id
`;

// ---------------------------------------------------------------- public reads

export async function listPublicProducts(): Promise<Product[]> {
  const sql = db();
  const rows = await sql`${PRODUCT_SELECT(sql)} WHERE p.is_active ORDER BY p.is_bestseller DESC, p.created_at DESC`;
  return rows.map(mapProduct);
}

export async function listCategories(activeOnly: boolean): Promise<Category[]> {
  const sql = db();
  const rows = activeOnly
    ? await sql`SELECT * FROM categories WHERE is_active ORDER BY sort_order, name`
    : await sql`SELECT * FROM categories ORDER BY sort_order, name`;
  return rows.map(mapCategory);
}

export async function listApprovedReviews(limit = 40): Promise<Review[]> {
  const rows = await db()`
    SELECT r.*, p.name AS product_name FROM reviews r
    LEFT JOIN products p ON p.id = r.product_id
    WHERE r.is_approved ORDER BY r.created_at DESC LIMIT ${limit}
  `;
  return rows.map((r) => {
    const { isApproved: _a, orderNumber: _o, ...pub } = mapReview(r);
    return pub;
  });
}

export async function getPublicStoreState(): Promise<PublicStoreState> {
  const [settings, categories, products, reviews] = await Promise.all([
    getAllSettings(),
    listCategories(true),
    listPublicProducts(),
    listApprovedReviews()
  ]);
  const { pan: _pan, shiprocketPickupNickname: _n, delhiveryPickupName: _d, contactName: _c, phone: _p, ...publicBusiness } = settings.business;
  const razorpayOn = settings.payments.enableRazorpay && (await razorpayConfigured());
  return {
    storeConfig: settings.store,
    pickupAddress: publicBusiness,
    paymentShipping: {
      ...settings.payments,
      enableUpi: settings.payments.enableUpi && Boolean(settings.payments.upiId),
      enableRazorpay: razorpayOn,
      razorpayKeyId: razorpayOn ? await razorpayKeyId() : ''
    },
    policiesSeo: { ...settings.seo, ...settings.policies },
    categories,
    products,
    reviews
  };
}

// ---------------------------------------------------------------- admin: products

const intField = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const dimField = z.coerce.number().positive().max(500);

export const productInputSchema = z.object({
  name: z.string().trim().min(2).max(250),
  sku: z.string().trim().toUpperCase().min(2).max(50).regex(/^[A-Z0-9\-_]+$/, 'SKU may contain letters, numbers, - and _'),
  categoryId: z.string().uuid().nullable(),
  section: z.enum(PRODUCT_SECTIONS as [ProductSection, ...ProductSection[]]),
  sellingPrice: intField(1, 10_000_000),
  mrp: intField(1, 10_000_000),
  costPrice: intField(0, 10_000_000),
  stock: intField(0, 1_000_000),
  images: z.array(z.string().trim().min(1).max(2000)).max(10)
    .refine((a) => a.every((u) => /^https?:\/\//.test(u) || u.startsWith('/api/images/')), 'Images must be uploaded files or https URLs'),
  description: z.string().trim().max(5000),
  spiritualBenefits: z.array(z.string().trim().min(1).max(300)).max(12),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  weightKg: z.coerce.number().positive().max(100),
  dimensions: z.object({ lengthCm: dimField, breadthCm: dimField, heightCm: dimField }),
  isBestseller: z.boolean(),
  isActive: z.boolean().default(true),
  hsnCode: z.string().trim().max(10).regex(/^[0-9]*$/, 'HSN code must be numeric').default(''),
  gstRate: z.coerce.number().refine((v) => [0, 3, 5, 12, 18, 28].includes(v), 'GST rate must be 0, 3, 5, 12, 18 or 28')
}).refine((p) => p.mrp >= p.sellingPrice, { message: 'MRP must be greater than or equal to the selling price', path: ['mrp'] });

export type ProductInput = z.infer<typeof productInputSchema>;

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const sql = db();
  const rows = await sql`${PRODUCT_SELECT(sql)} ORDER BY p.created_at DESC`;
  return rows.map(mapAdminProduct);
}

async function getAdminProduct(id: string): Promise<AdminProduct> {
  const sql = db();
  const [row] = await sql`${PRODUCT_SELECT(sql)} WHERE p.id = ${id}`;
  if (!row) throw new ApiError(404, 'Product not found.');
  return mapAdminProduct(row);
}

function productColumns(p: ProductInput) {
  return {
    name: p.name,
    sku: p.sku,
    category_id: p.categoryId,
    section: p.section,
    selling_price: p.sellingPrice,
    mrp: p.mrp,
    cost_price: p.costPrice,
    stock: p.stock,
    images: p.images,
    description: p.description,
    benefits: p.spiritualBenefits,
    tags: p.tags,
    weight_kg: p.weightKg,
    length_cm: p.dimensions.lengthCm,
    breadth_cm: p.dimensions.breadthCm,
    height_cm: p.dimensions.heightCm,
    is_bestseller: p.isBestseller,
    is_active: p.isActive,
    hsn_code: p.hsnCode,
    gst_rate: p.gstRate
  };
}

export function slugify(name: string, sku: string): string {
  return `${name}-${sku}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

export async function createProduct(input: ProductInput): Promise<AdminProduct> {
  const sql = db();
  // The slug is fixed at creation so product links never break when the name is edited.
  const [row] = await sql`INSERT INTO products ${sql({ ...productColumns(input), slug: slugify(input.name, input.sku) })} RETURNING id`;
  return getAdminProduct(row.id);
}

export async function getPublicProductBySlug(slug: string): Promise<Product | null> {
  const sql = db();
  const [row] = await sql`${PRODUCT_SELECT(sql)} WHERE p.slug = ${slug} AND p.is_active`;
  return row ? mapProduct(row) : null;
}

export async function listProductReviews(productId: string): Promise<Review[]> {
  const rows = await db()`
    SELECT r.*, p.name AS product_name FROM reviews r LEFT JOIN products p ON p.id = r.product_id
    WHERE r.is_approved AND r.product_id = ${productId} ORDER BY r.created_at DESC LIMIT 50
  `;
  return rows.map((r) => {
    const { isApproved: _a, orderNumber: _o, ...pub } = mapReview(r);
    return pub;
  });
}

export async function updateProduct(id: string, input: ProductInput): Promise<AdminProduct> {
  const sql = db();
  const res = await sql`UPDATE products SET ${sql(productColumns(input))}, updated_at = now() WHERE id = ${id} RETURNING id`;
  if (res.length === 0) throw new ApiError(404, 'Product not found.');
  return getAdminProduct(id);
}

export async function deleteProduct(id: string): Promise<{ archived: boolean }> {
  const sql = db();
  const [{ used }] = await sql<{ used: number }[]>`SELECT COUNT(*)::int AS used FROM order_items WHERE product_id = ${id}`;
  if (used > 0) {
    // Keep order history intact: archive instead of deleting.
    await sql`UPDATE products SET is_active = false, updated_at = now() WHERE id = ${id}`;
    return { archived: true };
  }
  const res = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`;
  if (res.length === 0) throw new ApiError(404, 'Product not found.');
  return { archived: false };
}

// ---------------------------------------------------------------- admin: categories

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug may contain a-z, 0-9 and -'),
  image: z.string().trim().max(2000).default(''),
  description: z.string().trim().max(300).default(''),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true)
});

export async function upsertCategory(id: string | null, c: z.infer<typeof categoryInputSchema>): Promise<Category> {
  const sql = db();
  const cols = { name: c.name, slug: c.slug, image_url: c.image, description: c.description, sort_order: c.sortOrder, is_active: c.isActive };
  const [row] = id
    ? await sql`UPDATE categories SET ${sql(cols)}, updated_at = now() WHERE id = ${id} RETURNING *`
    : await sql`INSERT INTO categories ${sql(cols)} RETURNING *`;
  if (!row) throw new ApiError(404, 'Category not found.');
  return mapCategory(row);
}

export async function deleteCategory(id: string) {
  const res = await db()`DELETE FROM categories WHERE id = ${id} RETURNING id`;
  if (res.length === 0) throw new ApiError(404, 'Category not found.');
}

// ---------------------------------------------------------------- admin: reviews

export async function listAdminReviews(): Promise<AdminReview[]> {
  const rows = await db()`
    SELECT r.*, p.name AS product_name, o.order_number FROM reviews r
    LEFT JOIN products p ON p.id = r.product_id
    LEFT JOIN orders o ON o.id = r.order_id
    ORDER BY r.is_approved ASC, r.created_at DESC LIMIT 500
  `;
  return rows.map(mapReview);
}

export async function moderateReview(id: string, patch: { isApproved?: boolean; isVerifiedBuyer?: boolean }) {
  const sql = db();
  const res = await sql`
    UPDATE reviews SET
      is_approved = COALESCE(${patch.isApproved ?? null}, is_approved),
      is_verified_buyer = COALESCE(${patch.isVerifiedBuyer ?? null}, is_verified_buyer)
    WHERE id = ${id} RETURNING id
  `;
  if (res.length === 0) throw new ApiError(404, 'Review not found.');
}

export async function deleteReview(id: string) {
  await db()`DELETE FROM reviews WHERE id = ${id}`;
}
