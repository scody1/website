-- =====================================================================
-- Dynamic roles: roles live in the database with a list of permission keys
-- (see lib/shared/roles.ts for the catalogue). Super Admin is built in.
-- =====================================================================

CREATE TABLE IF NOT EXISTS roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT NOT NULL UNIQUE CHECK (key ~ '^[A-Z][A-Z0-9_]{1,39}$'),
  name         TEXT NOT NULL UNIQUE,
  description  TEXT NOT NULL DEFAULT '',
  permissions  TEXT[] NOT NULL DEFAULT '{}',
  is_system    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Presets (same as PRESET_ROLES in lib/shared/roles.ts). Super Admin's permission list is
-- ignored at runtime — it always has every permission, including ones added later.
INSERT INTO roles (key, name, description, permissions, is_system) VALUES
  ('SUPER_ADMIN', 'Super Admin', 'Full access to everything. Cannot be edited or deleted.', '{}', true),
  ('MANAGER', 'Store Manager', 'Runs the store: orders, payments, refunds, shipping, products, coupons, reviews, reports and store settings.',
    ARRAY['orders.view','orders.status','orders.cancel','orders.notes','orders.export','payments.verify','payments.refund',
          'shipping.book','shipping.setup','customers.view','customers.export','products.view','products.create','products.edit',
          'products.delete','products.stock','products.cost','categories.manage','coupons.view','coupons.manage','reviews.view',
          'reviews.moderate','reports.sales','settings.store','settings.pickup','settings.payments','settings.seo'], false),
  ('STAFF', 'Dispatch Staff', 'Packs and ships: sees orders and customers, updates order status, books couriers.',
    ARRAY['orders.view','orders.status','orders.notes','shipping.book','customers.view','products.view'], false),
  ('VIEWER', 'Viewer / Accountant', 'Read-only: orders, customers, products with cost prices, coupons, reviews and sales reports.',
    ARRAY['orders.view','orders.export','customers.view','products.view','products.cost','coupons.view','reviews.view','reports.sales'], false)
ON CONFLICT (key) DO NOTHING;

-- Users now reference a role row instead of a fixed list.
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_role_fk') THEN
    ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_fk
      FOREIGN KEY (role) REFERENCES roles(key) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE roles FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE roles FROM authenticated; END IF;
END $$;
