-- =====================================================================
-- 006: customer-account hardening, wishlist, return requests,
--      live courier tracking storage and safe (locked) refunds.
-- =====================================================================

-- Wishlist saved per customer account
CREATE TABLE IF NOT EXISTS customer_wishlist (
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, product_id)
);

-- Return / refund requests raised by customers after dispatch
CREATE TABLE IF NOT EXISTS return_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  reason        TEXT NOT NULL,
  refund_upi    TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','APPROVED','REJECTED','COMPLETED')),
  admin_note    TEXT NOT NULL DEFAULT '',
  resolved_by   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS return_requests_order_idx ON return_requests(order_id);
-- At most one open request per order
CREATE UNIQUE INDEX IF NOT EXISTS return_requests_one_open ON return_requests(order_id) WHERE status = 'OPEN';

-- Live courier tracking timeline (Shiprocket / Delhivery scans) shown to customers
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_activities JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_etd TEXT;

-- Refund lock: prevents two refunds for the same order running at the same time
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_locked_at TIMESTAMPTZ;

-- Lock every new table out of Supabase's public REST API (server-only access)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','customer_sessions','customer_wishlist','return_requests'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM anon', t);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM authenticated', t);
    END IF;
  END LOOP;
END $$;
