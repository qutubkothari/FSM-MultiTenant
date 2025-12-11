-- Fix existing data that may not have tenant_id populated
-- This assumes visits were created by salesmen who belong to tenants

-- Update visits with tenant_id from the salesman's tenant
UPDATE visits v
SET tenant_id = s.tenant_id
FROM salesmen s
WHERE v.salesman_id = s.id
  AND v.tenant_id IS NULL;

-- Update customers with tenant_id from their first visit
UPDATE customers c
SET tenant_id = (
  SELECT v.tenant_id 
  FROM visits v 
  WHERE v.customer_name = c.name 
    AND v.tenant_id IS NOT NULL 
  ORDER BY v.created_at ASC 
  LIMIT 1
)
WHERE c.tenant_id IS NULL;

-- Verify counts
SELECT 
  'visits' as table_name,
  COUNT(*) FILTER (WHERE tenant_id IS NULL) as null_tenant_count,
  COUNT(*) as total_count
FROM visits
UNION ALL
SELECT 
  'customers' as table_name,
  COUNT(*) FILTER (WHERE tenant_id IS NULL) as null_tenant_count,
  COUNT(*) as total_count
FROM customers
UNION ALL
SELECT 
  'salesmen' as table_name,
  COUNT(*) FILTER (WHERE tenant_id IS NULL) as null_tenant_count,
  COUNT(*) as total_count
FROM salesmen
UNION ALL
SELECT 
  'products' as table_name,
  COUNT(*) FILTER (WHERE tenant_id IS NULL) as null_tenant_count,
  COUNT(*) as total_count
FROM products;
