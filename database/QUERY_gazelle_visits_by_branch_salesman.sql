-- Gazelle: Visits by Company / Branch / Salesman (all dates)
-- Includes visit_type.
-- Run in Supabase SQL Editor.

WITH gazelle_tenants AS (
  SELECT id, company_name
  FROM tenants
  WHERE is_active = true
    AND company_name ILIKE '%Gazelle%'
)
SELECT
  t.company_name,
  COALESCE(
    CASE
      WHEN s.plant IS NULL OR array_length(s.plant, 1) IS NULL THEN 'HQ'
      WHEN array_length(s.plant, 1) > 0 THEN COALESCE(p.plant_name, 'Branch')
      ELSE 'HQ'
    END,
    'HQ'
  ) AS branch,
  COALESCE(s.name, v.salesman_name, 'Unknown') AS salesman,
  v.visit_type,
  COUNT(*) AS activities,
  COALESCE(SUM(v.order_value), 0) AS revenue,
  MIN(DATE(v.created_at)) AS first_date,
  MAX(DATE(v.created_at)) AS last_date
FROM visits v
JOIN gazelle_tenants t ON t.id = v.tenant_id
LEFT JOIN salesmen s ON s.id = v.salesman_id
LEFT JOIN plants p ON p.tenant_id = v.tenant_id AND p.id::text = s.plant[1]
WHERE v.deleted_at IS NULL
  AND v.visit_type IS NOT NULL
GROUP BY
  t.company_name,
  branch,
  salesman,
  v.visit_type
ORDER BY
  t.company_name,
  branch,
  salesman,
  v.visit_type;
