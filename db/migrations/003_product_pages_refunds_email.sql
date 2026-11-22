-- =====================================================================
-- Product pages (SEO slugs), refunds, customer e-mail tracking.
-- =====================================================================

-- Stable URL slug per product: /product/<slug>
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;
UPDATE products
   SET slug = trim(both '-' from lower(regexp_replace(name || '-' || sku, '[^a-zA-Z0-9]+', '-', 'g')))
 WHERE slug IS NULL OR slug = '';
ALTER TABLE products ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique ON products(slug);

-- Refunds
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_refund_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Which automatic e-mails were already sent (prevents duplicates)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmation_email_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_email_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_alert_at TIMESTAMPTZ;
