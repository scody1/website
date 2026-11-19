-- Migration: Create store_settings table for dynamic store state synchronization
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY,
    store_state JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read & write for store operations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'store_settings' AND policyname = 'Allow public read-write for store settings'
    ) THEN
        CREATE POLICY "Allow public read-write for store settings"
        ON public.store_settings
        FOR ALL
        TO anon, authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;
