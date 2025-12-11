-- ============================================
-- Step 3: Migrate Existing Data to Default Tenant
-- Run this in Supabase SQL Editor
-- ============================================

-- Migrate existing salesmen
UPDATE public.salesmen 
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Migrate existing visits
UPDATE public.visits 
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Migrate existing products
UPDATE public.products 
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Migrate existing targets (if any)
UPDATE public.salesman_targets 
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- Verify migration
SELECT 
  'salesmen' as table_name, 
  COUNT(*) as total,
  COUNT(tenant_id) as with_tenant
FROM public.salesmen
UNION ALL
SELECT 
  'visits', 
  COUNT(*), 
  COUNT(tenant_id)
FROM public.visits
UNION ALL
SELECT 
  'products', 
  COUNT(*), 
  COUNT(tenant_id)
FROM public.products;
