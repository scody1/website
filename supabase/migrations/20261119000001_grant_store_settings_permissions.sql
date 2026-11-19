-- Grant table privileges to anon and authenticated roles
GRANT ALL ON TABLE public.store_settings TO anon, authenticated, service_role;
