-- Gazelle Companies Weekly Visits Summary
-- Pivot format: Branch, Salesman, Physical, Telephone, Revenue, First/Last Date

SELECT 
  t.company_name as branch,
  COALESCE(v.salesman_name, s.name) as salesman,
  CASE 
    WHEN COUNT(CASE WHEN v.visit_type = 'personal_visit' THEN 1 END) >= 
         COUNT(CASE WHEN v.visit_type = 'telephone_call' THEN 1 END) 
    THEN 'personal' 
    ELSE 'telephone' 
  END as visit_type,
  COUNT(CASE WHEN v.visit_type = 'personal_visit' THEN 1 END) as "Physical",
  COUNT(CASE WHEN v.visit_type = 'telephone_call' THEN 1 END) as "Telephone",
  COALESCE(SUM(v.order_value), 0) as revenue,
  TO_CHAR(MIN(v.created_at), 'DD-MM-YYYY') as first_date,
  TO_CHAR(MAX(v.created_at), 'DD-MM-YYYY') as last_date
FROM visits v
JOIN salesmen s ON v.salesman_id = s.id
JOIN tenants t ON s.tenant_id = t.id
WHERE s.tenant_id IN (
  'fd43ab22-cc00-4fca-9dbf-768c0949c468',  -- Gazelle Envelopes
  '84c1ba8d-53ab-43ef-9483-d997682f3072',  -- GAZELLE
  'fa47fd9f-253f-44c6-af02-86165f018321'   -- Crescent
)
  AND v.created_at::date >= CURRENT_DATE - INTERVAL '6 days'
  AND v.created_at::date <= CURRENT_DATE
  AND v.deleted_at IS NULL
GROUP BY t.company_name, COALESCE(v.salesman_name, s.name)
ORDER BY t.company_name, COALESCE(v.salesman_name, s.name);


-- Summary by Company, Salesman and Day
SELECT 
  TO_CHAR(v.created_at::date, 'Dy, DD Mon YYYY') as date,
  t.company_name as company,
  v.salesman_name,
  COUNT(CASE WHEN v.visit_type = 'personal_visit' THEN 1 END) as personal_visits,
  COUNT(CASE WHEN v.visit_type = 'telephone_call' THEN 1 END) as telephone_calls,
  COUNT(*) as total_activities,
  COALESCE(SUM(v.order_value), 0) as total_revenue
FROM visits v
JOIN salesmen s ON v.salesman_id = s.id
JOIN tenants t ON s.tenant_id = t.id
WHERE s.tenant_id IN (
  'fd43ab22-cc00-4fca-9dbf-768c0949c468',
  '84c1ba8d-53ab-43ef-9483-d997682f3072',
  'fa47fd9f-253f-44c6-af02-86165f018321'
)
  AND v.created_at::date >= CURRENT_DATE - INTERVAL '6 days'
  AND v.created_at::date <= CURRENT_DATE
  AND v.deleted_at IS NULL
GROUP BY v.created_at::date, t.company_name, v.salesman_name
ORDER BY v.created_at::date DESC, t.company_name, v.salesman_name;


-- Daily Summary by Company Only
SELECT 
  TO_CHAR(v.created_at::date, 'Dy, DD Mon YYYY') as date,
  t.company_name as company,
  COUNT(DISTINCT v.salesman_id) as active_salesmen,
  COUNT(CASE WHEN v.visit_type = 'personal_visit' THEN 1 END) as personal_visits,
  COUNT(CASE WHEN v.visit_type = 'telephone_call' THEN 1 END) as telephone_calls,
  COUNT(*) as total_activities,
  COALESCE(SUM(v.order_value), 0) as total_revenue
FROM visits v
JOIN salesmen s ON v.salesman_id = s.id
JOIN tenants t ON s.tenant_id = t.id
WHERE s.tenant_id IN (
  'fd43ab22-cc00-4fca-9dbf-768c0949c468',
  '84c1ba8d-53ab-43ef-9483-d997682f3072',
  'fa47fd9f-253f-44c6-af02-86165f018321'
)
  AND v.created_at::date >= CURRENT_DATE - INTERVAL '6 days'
  AND v.created_at::date <= CURRENT_DATE
  AND v.deleted_at IS NULL
GROUP BY v.created_at::date, t.company_name
ORDER BY v.created_at::date DESC, t.company_name;
