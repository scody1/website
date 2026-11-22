-- =====================================================================
-- Rajeshwar Pooja Samagri — core schema
-- All money values are whole Indian Rupees (integer).
-- The app connects as the database owner through DATABASE_URL and is the
-- ONLY thing that reads or writes these tables. On Supabase, the public
-- anon/authenticated roles are explicitly locked out (see bottom).
-- =====================================================================

-- ---------- Settings (key/value JSON, one row per section) ----------
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Catalog ----------
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  image_url   TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  sku             TEXT NOT NULL UNIQUE,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  section         TEXT NOT NULL DEFAULT 'EXPLORE'
                  CHECK (section IN ('BESTSELLER','ZODIAC','SHANKH','DEEPAM','MURTI','URLI','EXPLORE')),
  selling_price   INTEGER NOT NULL CHECK (selling_price > 0),
  mrp             INTEGER NOT NULL CHECK (mrp > 0),
  cost_price      INTEGER NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  images          TEXT[] NOT NULL DEFAULT '{}',
  description     TEXT NOT NULL DEFAULT '',
  benefits        TEXT[] NOT NULL DEFAULT '{}',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  weight_kg       NUMERIC(6,3) NOT NULL DEFAULT 0.5 CHECK (weight_kg > 0),
  length_cm       NUMERIC(6,1) NOT NULL DEFAULT 15 CHECK (length_cm > 0),
  breadth_cm      NUMERIC(6,1) NOT NULL DEFAULT 12 CHECK (breadth_cm > 0),
  height_cm       NUMERIC(6,1) NOT NULL DEFAULT 10 CHECK (height_cm > 0),
  hsn_code        TEXT NOT NULL DEFAULT '',
  gst_rate        NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (gst_rate >= 0 AND gst_rate <= 28),
  is_bestseller   BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);

-- Uploaded product images (kept in the database so no extra storage service is needed)
CREATE TABLE IF NOT EXISTS images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type  TEXT NOT NULL,
  data          BYTEA NOT NULL,
  size_bytes    INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Coupons ----------
CREATE TABLE IF NOT EXISTS coupons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE CHECK (code = upper(code) AND length(code) BETWEEN 3 AND 30),
  description      TEXT NOT NULL DEFAULT '',
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('PERCENT','FLAT')),
  discount_value   INTEGER NOT NULL CHECK (discount_value > 0),
  max_discount     INTEGER CHECK (max_discount IS NULL OR max_discount > 0),
  min_order_value  INTEGER NOT NULL DEFAULT 0 CHECK (min_order_value >= 0),
  usage_limit      INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  used_count       INTEGER NOT NULL DEFAULT 0,
  starts_at        TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (discount_type <> 'PERCENT' OR discount_value <= 100)
);

-- ---------- Orders ----------
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 100001;

CREATE TABLE IF NOT EXISTS orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number          TEXT NOT NULL UNIQUE DEFAULT ('RPS-' || nextval('order_number_seq')::text),

  customer_name         TEXT NOT NULL,
  customer_phone        TEXT NOT NULL,
  customer_email        TEXT NOT NULL DEFAULT '',
  address_line1         TEXT NOT NULL,
  address_line2         TEXT NOT NULL DEFAULT '',
  city                  TEXT NOT NULL,
  state                 TEXT NOT NULL,
  pincode               TEXT NOT NULL CHECK (pincode ~ '^[1-9][0-9]{5}$'),

  subtotal              INTEGER NOT NULL CHECK (subtotal >= 0),
  discount              INTEGER NOT NULL DEFAULT 0 CHECK (discount >= 0),
  coupon_code           TEXT,
  shipping_fee          INTEGER NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  cod_fee               INTEGER NOT NULL DEFAULT 0 CHECK (cod_fee >= 0),
  total                 INTEGER NOT NULL CHECK (total >= 0),

  payment_method        TEXT NOT NULL CHECK (payment_method IN ('COD','UPI','RAZORPAY')),
  payment_status        TEXT NOT NULL CHECK (payment_status IN ('PENDING','AWAITING_VERIFICATION','PAID','FAILED','REFUNDED')),
  status                TEXT NOT NULL CHECK (status IN (
                          'PENDING_PAYMENT','NEW','PROCESSING','PACKED','READY_TO_SHIP','PICKUP_SCHEDULED',
                          'SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RTO','REFUNDED')),

  utr_number            TEXT,
  razorpay_order_id     TEXT UNIQUE,
  razorpay_payment_id   TEXT UNIQUE,
  paid_at               TIMESTAMPTZ,

  admin_notes           TEXT NOT NULL DEFAULT '',
  cancel_reason         TEXT NOT NULL DEFAULT '',
  refund_notes          TEXT NOT NULL DEFAULT '',
  stock_restored        BOOLEAN NOT NULL DEFAULT false,

  -- Shipping / courier
  courier_provider      TEXT,             -- 'SHIPROCKET' | 'MANUAL'
  sr_order_id           BIGINT,
  sr_shipment_id        BIGINT,
  courier_name          TEXT,
  courier_company_id    INTEGER,
  awb_code              TEXT,
  tracking_url          TEXT,
  label_url             TEXT,
  sr_invoice_url        TEXT,
  pickup_scheduled_for  TEXT,
  shipping_status       TEXT,             -- raw courier status text
  shipping_cost         INTEGER,          -- what the courier charges the store (for profit)
  package_weight_kg     NUMERIC(6,3),
  last_tracking_sync    TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders(customer_phone);
CREATE UNIQUE INDEX IF NOT EXISTS orders_utr_unique ON orders(utr_number) WHERE utr_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_awb_unique ON orders(awb_code) WHERE awb_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  sku          TEXT NOT NULL,
  image_url    TEXT NOT NULL DEFAULT '',
  unit_price   INTEGER NOT NULL CHECK (unit_price >= 0),
  cost_price   INTEGER NOT NULL DEFAULT 0,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  line_total   INTEGER NOT NULL CHECK (line_total >= 0),
  hsn_code     TEXT NOT NULL DEFAULT '',
  gst_rate     NUMERIC(5,2) NOT NULL DEFAULT 0,
  weight_kg    NUMERIC(6,3) NOT NULL DEFAULT 0.5,
  length_cm    NUMERIC(6,1) NOT NULL DEFAULT 15,
  breadth_cm   NUMERIC(6,1) NOT NULL DEFAULT 12,
  height_cm    NUMERIC(6,1) NOT NULL DEFAULT 10
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items(product_id);

-- Full audit trail of every status / payment / shipping change
CREATE TABLE IF NOT EXISTS order_events (
  id          BIGSERIAL PRIMARY KEY,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,              -- STATUS | PAYMENT | SHIPPING | NOTE | WARNING
  message     TEXT NOT NULL,
  actor       TEXT NOT NULL DEFAULT 'system',  -- system | admin | customer | courier | razorpay
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events(order_id, created_at);

-- ---------- Reviews ----------
CREATE TABLE IF NOT EXISTS reviews (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID REFERENCES products(id) ON DELETE SET NULL,
  order_id           UUID REFERENCES orders(id) ON DELETE SET NULL,
  author_name        TEXT NOT NULL,
  location           TEXT NOT NULL DEFAULT '',
  rating             INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title              TEXT NOT NULL DEFAULT '',
  comment            TEXT NOT NULL,
  is_verified_buyer  BOOLEAN NOT NULL DEFAULT false,
  is_approved        BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_product_idx ON reviews(product_id) WHERE is_approved;

-- ---------- Admin security ----------
CREATE TABLE IF NOT EXISTS admin_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  TEXT NOT NULL UNIQUE,
  ip          TEXT NOT NULL DEFAULT '',
  user_agent  TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key           TEXT PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  count         INTEGER NOT NULL DEFAULT 0
);

-- Processed webhook deliveries (idempotency)
CREATE TABLE IF NOT EXISTS webhook_events (
  id           TEXT PRIMARY KEY,
  source       TEXT NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Lock out Supabase public API roles ----------
-- On Supabase every table in "public" is reachable through the REST API with the
-- public anon key unless RLS blocks it. RLS is enabled with NO policies, and all
-- privileges are revoked, so only the server (table owner) can touch the data.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['settings','categories','products','images','coupons','orders',
                           'order_items','order_events','reviews','admin_sessions','rate_limits','webhook_events']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM anon', t);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM authenticated', t);
    END IF;
  END LOOP;

  -- The old prototype stored the entire store (orders, customer data, courier
  -- passwords) in a publicly writable "store_settings" row. Lock it down too.
  IF to_regclass('public.store_settings') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow public read-write for store settings" ON public.store_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Allow public storefront read" ON public.store_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Allow store state sync and order creation" ON public.store_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Allow store state insert" ON public.store_settings';
    EXECUTE 'ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY';
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE 'REVOKE ALL ON TABLE public.store_settings FROM anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE 'REVOKE ALL ON TABLE public.store_settings FROM authenticated';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SEQUENCE order_number_seq FROM anon;
  END IF;
END $$;
