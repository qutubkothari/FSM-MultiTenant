-- Fix unique constraint for multi-tenant targets
-- Ensures targets are unique per tenant, not globally.

-- 1) Drop old constraint (salesman_id, month, year) if it exists
ALTER TABLE public.salesman_targets
DROP CONSTRAINT IF EXISTS salesman_targets_salesman_id_month_year_key;

-- 2) Create tenant-aware unique constraint
ALTER TABLE public.salesman_targets
ADD CONSTRAINT salesman_targets_tenant_salesman_month_year_key
UNIQUE (tenant_id, salesman_id, month, year);
