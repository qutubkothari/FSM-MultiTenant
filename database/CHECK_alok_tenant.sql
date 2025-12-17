-- Check Alok's tenant and if message was sent to his tenant

-- 1. What tenant is Alok in?
SELECT 
  s.id as salesman_id,
  s.name,
  s.phone,
  s.tenant_id,
  t.company_name,
  t.name as tenant_name
FROM salesmen s
LEFT JOIN tenants t ON s.tenant_id = t.id
WHERE s.name ILIKE '%alok%'
  AND s.deleted_at IS NULL;

-- 2. Was a WhatsApp message logged for Alok's tenant on Dec 16?
SELECT 
  rsl.tenant_id,
  rsl.report_date,
  rsl.created_at,
  rsl.meta,
  t.company_name
FROM report_send_log rsl
LEFT JOIN tenants t ON rsl.tenant_id = t.id
WHERE rsl.report_date = '2025-12-16'
ORDER BY rsl.created_at DESC;

-- 3. Get all active salesmen for Alok's tenant (to see who should have received message)
SELECT 
  s.id,
  s.name,
  s.phone,
  s.is_active,
  s.tenant_id
FROM salesmen s
WHERE s.tenant_id = (
  SELECT tenant_id FROM salesmen WHERE name = 'Alok' AND deleted_at IS NULL LIMIT 1
)
AND s.is_active = true
AND s.deleted_at IS NULL
ORDER BY s.name;
