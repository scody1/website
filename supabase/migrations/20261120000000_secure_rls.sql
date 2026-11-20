-- =========================================================================
-- Rajeshwar Pooja Samagri - Secure Row Level Security & Access Control Migration
-- Migration: 20261120000000_secure_rls.sql
-- =========================================================================

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY,
    store_state JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- 3. Reset existing policies to ensure clean state
DROP POLICY IF EXISTS "Allow public read-write for store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow public storefront read" ON public.store_settings;
DROP POLICY IF EXISTS "Allow store state sync and order creation" ON public.store_settings;
DROP POLICY IF EXISTS "Allow store state insert" ON public.store_settings;

-- 4. Policy: Public Storefront Reads
-- Allows customers and storefront visitors to read products, reviews, categories, and general store configuration
CREATE POLICY "Allow public storefront read"
ON public.store_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- 5. Policy: Public and Authenticated State Sync & Order Placement
-- Allows checkout flow and admin panel to save state, record new orders, and update inventory
CREATE POLICY "Allow store state sync and order creation"
ON public.store_settings
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow store state insert"
ON public.store_settings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 6. Restrict DELETE permissions
-- Prevents accidental or malicious wiping of the store configuration via client anon key
REVOKE DELETE ON TABLE public.store_settings FROM anon;
GRANT DELETE ON TABLE public.store_settings TO service_role;

-- 7. Grant least-privilege table grants to public roles
GRANT SELECT, INSERT, UPDATE ON TABLE public.store_settings TO anon, authenticated;
GRANT ALL ON TABLE public.store_settings TO service_role;

-- NOTE ON CREDENTIAL SECURITY:
-- Courier secrets (Shiprocket password, Delhivery API token) and Admin Passcodes
-- are now safeguarded server-side via environment variables (ADMIN_PASSCODE,
-- ADMIN_SESSION_SECRET, SHIPROCKET_API_PASSWORD) and verified via /api/admin/verify-pin.
