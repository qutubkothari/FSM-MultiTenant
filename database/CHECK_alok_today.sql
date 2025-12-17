-- Check Alok's visits for TODAY (Dec 17)
SELECT 
  v.id,
  v.salesman_name,
  v.customer_name,
  v.visit_type,
  v.created_at
FROM visits v
WHERE v.salesman_id = 'b4cc8d15-2099-43e2-b1f8-435e31b69658'
  AND DATE(v.created_at) = '2025-12-17'
  AND v.deleted_at IS NULL
ORDER BY v.created_at DESC;

-- What would TODAY's summary show for Alok?
SELECT get_daily_salesman_summary(
  'b4cc8d15-2099-43e2-b1f8-435e31b69658'::uuid,
  '2025-12-17'::date
);

-- All visits today for Hylite tenant
SELECT 
  v.salesman_name,
  COUNT(*) as visits_today
FROM visits v
JOIN salesmen s ON v.salesman_id = s.id
WHERE s.tenant_id = '112f12b8-55e9-4de8-9fda-d58e37c75796'
  AND DATE(v.created_at) = '2025-12-17'
  AND v.deleted_at IS NULL
GROUP BY v.salesman_name
ORDER BY v.salesman_name;
