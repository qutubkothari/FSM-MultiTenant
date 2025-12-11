-- ============================================
-- Step 4: Make tenant_id Required
-- Run this in Supabase SQL Editor
-- ONLY AFTER Steps 1-3 are complete!
-- ============================================

-- Make tenant_id NOT NULL
ALTER TABLE public.salesmen ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.visits ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.salesman_targets ALTER COLUMN tenant_id SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_salesmen_tenant ON public.salesmen(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visits_tenant ON public.visits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_targets_tenant ON public.salesman_targets(tenant_id);

-- Verify
SELECT 
  table_name,
  column_name,
  is_nullable
FROM information_schema.columns
WHERE column_name = 'tenant_id'
  AND table_schema = 'public'
ORDER BY table_name;
