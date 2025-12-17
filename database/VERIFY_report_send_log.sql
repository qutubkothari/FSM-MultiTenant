-- VERIFICATION QUERIES: Run these in Supabase SQL Editor to check if everything is set up

-- Check 1: Does the table exist?
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'report_send_log';

-- Check 2: Is RLS enabled on the table?
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'report_send_log';

-- Check 3: What policies exist on the table?
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'report_send_log';

-- Check 4: What's the table structure?
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'report_send_log'
ORDER BY ordinal_position;

-- Check 5: Are there any rows in the table yet?
SELECT COUNT(*) as row_count FROM public.report_send_log;

-- Check 6: When were messages sent?
SELECT * FROM public.report_send_log ORDER BY created_at DESC;

-- Check 7: Visits for yesterday and today by salesman
SELECT 
  u.name as salesman_name,
  u.phone as salesman_phone,
  DATE(v.created_at) as visit_date,
  COUNT(*) as visit_count,
  STRING_AGG(DISTINCT v.customer_name, ', ') as customers_visited
FROM visits v
JOIN users u ON v.salesman_id = u.id
WHERE DATE(v.created_at) >= CURRENT_DATE - INTERVAL '1 day'
  AND v.deleted_at IS NULL
GROUP BY u.name, u.phone, DATE(v.created_at)
ORDER BY visit_date DESC, salesman_name;

-- Check 8: All visit details for Alok (yesterday and today)
SELECT 
  v.id,
  u.name as salesman_name,
  u.phone as salesman_phone,
  v.customer_name,
  v.visit_type,
  v.notes,
  v.created_at,
  v.synced,
  v.deleted_at
FROM visits v
JOIN users u ON v.salesman_id = u.id
WHERE u.name ILIKE '%alok%'
  AND DATE(v.created_at) >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY v.created_at DESC;

-- Check 9: Count visits by tenant for yesterday and today
SELECT 
  t.company_name,
  DATE(v.created_at) as visit_date,
  COUNT(*) as visit_count
FROM visits v
JOIN users u ON v.salesman_id = u.id
JOIN tenants t ON u.tenant_id = t.id
WHERE DATE(v.created_at) >= CURRENT_DATE - INTERVAL '1 day'
  AND v.deleted_at IS NULL
GROUP BY t.company_name, DATE(v.created_at)
ORDER BY visit_date DESC, t.company_name;

-- Check 10: Find ALL users with "alok" in name (any spelling)
SELECT id, name, phone, role, tenant_id, created_at
FROM users
WHERE name ILIKE '%alok%'
ORDER BY created_at DESC;

-- Check 11: ALL visits for Alok (no date filter)
SELECT 
  v.id,
  u.name as salesman_name,
  u.phone as salesman_phone,
  v.customer_name,
  v.visit_type,
  DATE(v.created_at) as visit_date,
  v.created_at,
  v.synced,
  v.deleted_at,
  CASE WHEN v.deleted_at IS NULL THEN 'ACTIVE' ELSE 'DELETED' END as status
FROM visits v
JOIN users u ON v.salesman_id = u.id
WHERE u.name ILIKE '%alok%'
ORDER BY v.created_at DESC
LIMIT 50;

-- Check 12: Check if visits exist but are NOT synced yet
SELECT 
  u.name as salesman_name,
  v.synced,
  COUNT(*) as count
FROM visits v
JOIN users u ON v.salesman_id = u.id
WHERE u.name ILIKE '%alok%'
GROUP BY u.name, v.synced;

-- Check 13: Total visits in database (last 7 days, all salesmen)
SELECT 
  u.name as salesman_name,
  DATE(v.created_at) as visit_date,
  COUNT(*) as visit_count
FROM visits v
JOIN users u ON v.salesman_id = u.id
WHERE DATE(v.created_at) >= CURRENT_DATE - INTERVAL '7 days'
  AND v.deleted_at IS NULL
GROUP BY u.name, DATE(v.created_at)
ORDER BY visit_date DESC, u.name;

-- Check 14: Are there ANY visits at all in the database?
SELECT COUNT(*) as total_visits FROM visits;

-- Check 15: Most recent visits (any date, any salesman)
SELECT 
  v.id,
  u.name as salesman_name,
  v.customer_name,
  v.visit_type,
  v.created_at,
  v.synced
FROM visits v
LEFT JOIN users u ON v.salesman_id = u.id
ORDER BY v.created_at DESC
LIMIT 20;

-- Check 16: Check visits specifically for the 2 Alok user IDs
SELECT 
  v.id,
  v.salesman_id,
  v.customer_name,
  v.visit_type,
  v.created_at,
  v.synced,
  v.deleted_at
FROM visits v
WHERE v.salesman_id IN ('5cd01a58-2a27-45ec-8e5b-21a88c9b4d9d', '48e61957-3431-43cf-a75f-3d95c15ab1c5')
ORDER BY v.created_at DESC
LIMIT 50;

-- Check 17: What salesman_id values are actually in visits table?
SELECT 
  v.salesman_id,
  COUNT(*) as visit_count,
  MAX(v.created_at) as most_recent_visit
FROM visits v
WHERE v.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY v.salesman_id
ORDER BY most_recent_visit DESC;

-- Check 18: Show recent visits WITH their actual salesman_id (no join)
SELECT 
  v.id,
  v.salesman_id,
  v.salesman_name,
  v.customer_name,
  v.visit_type,
  v.created_at
FROM visits v
WHERE v.created_at >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY v.created_at DESC
LIMIT 20;

-- Check 19: Compare - which salesman_ids in visits DON'T exist in users?
SELECT DISTINCT v.salesman_id
FROM visits v
WHERE v.salesman_id NOT IN (SELECT id FROM users)
AND v.created_at >= CURRENT_DATE - INTERVAL '7 days'
LIMIT 20;
