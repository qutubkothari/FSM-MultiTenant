-- ============================================
-- Step 1: Create Tenants Table
-- Run this in Supabase SQL Editor
-- ============================================

-- Create tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1976d2',
  secondary_color TEXT DEFAULT '#dc004e',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT tenants_pkey PRIMARY KEY (id)
);

-- Create default tenant
INSERT INTO public.tenants (id, name, slug, company_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Company', 'default', 'Default Company')
ON CONFLICT DO NOTHING;

-- Verify
SELECT * FROM public.tenants;
