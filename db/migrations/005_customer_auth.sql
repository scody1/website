-- =====================================================================
-- 005_customer_auth.sql
-- Customer accounts, password authentication, saved profiles, and sessions.
-- =====================================================================

CREATE TABLE IF NOT EXISTS customers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL UNIQUE,
  email          TEXT UNIQUE,
  password_hash  TEXT NOT NULL,
  address_line1  TEXT NOT NULL DEFAULT '',
  address_line2  TEXT NOT NULL DEFAULT '',
  city           TEXT NOT NULL DEFAULT '',
  state          TEXT NOT NULL DEFAULT '',
  pincode        TEXT NOT NULL DEFAULT '',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email);

CREATE TABLE IF NOT EXISTS customer_sessions (
  token_hash   TEXT PRIMARY KEY,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  ip           TEXT NOT NULL DEFAULT '',
  user_agent   TEXT NOT NULL DEFAULT '',
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_sessions_customer_idx ON customer_sessions(customer_id);

-- Link orders to customer account
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id);
