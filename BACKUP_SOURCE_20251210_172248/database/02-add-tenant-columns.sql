-- ============================================
-- Step 2: Add tenant_id Columns
-- Run this in Supabase SQL Editor
-- ============================================

-- Add tenant_id to salesmen
ALTER TABLE public.salesmen 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Add tenant_id to visits
ALTER TABLE public.visits 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Add tenant_id to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Add tenant_id to salesman_targets (if table exists)
ALTER TABLE public.salesman_targets 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Verify
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name = 'tenant_id'
  AND table_schema = 'public'
ORDER BY table_name;
