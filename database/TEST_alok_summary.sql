-- Test get_daily_salesman_summary for Alok's two user IDs

-- Test Alok1 (5cd01a58-2a27-45ec-8e5b-21a88c9b4d9d) for Dec 16
SELECT get_daily_salesman_summary(
  '5cd01a58-2a27-45ec-8e5b-21a88c9b4d9d'::uuid,
  '2025-12-16'::date
);

-- Test Alok (48e61957-3431-43cf-a75f-3d95c15ab1c5) for Dec 16
SELECT get_daily_salesman_summary(
  '48e61957-3431-43cf-a75f-3d95c15ab1c5'::uuid,
  '2025-12-16'::date
);

-- Test for today Dec 17 (should be 0)
SELECT get_daily_salesman_summary(
  '48e61957-3431-43cf-a75f-3d95c15ab1c5'::uuid,
  '2025-12-17'::date
);

-- Also check: Does Alok exist in salesmen table?
SELECT id, name, phone, is_active, deleted_at, is_admin
FROM salesmen
WHERE name ILIKE '%alok%';

-- Which salesman_id had visits on Dec 16?
SELECT DISTINCT v.salesman_id, s.name, s.phone
FROM visits v
LEFT JOIN salesmen s ON v.salesman_id = s.id
WHERE DATE(v.created_at) = '2025-12-16'
  AND v.deleted_at IS NULL;
