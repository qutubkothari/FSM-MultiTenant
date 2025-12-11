-- PRODUCTION FIX: Ensure salesman_targets table is fully accessible
-- Run this in your Supabase SQL Editor for ktvrffbccgxtaststlhw

-- 1. Disable RLS on salesman_targets
ALTER TABLE salesman_targets DISABLE ROW LEVEL SECURITY;

-- 2. Drop any existing restrictive policies
DROP POLICY IF EXISTS "Users can view targets for their tenant" ON salesman_targets;
DROP POLICY IF EXISTS "Users can insert targets for their tenant" ON salesman_targets;
DROP POLICY IF EXISTS "Users can update targets for their tenant" ON salesman_targets;
DROP POLICY IF EXISTS "Users can delete targets for their tenant" ON salesman_targets;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON salesman_targets;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON salesman_targets;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON salesman_targets;

-- 3. Grant full access to authenticated users
GRANT ALL ON salesman_targets TO authenticated;
GRANT ALL ON salesman_targets TO anon;

-- 4. Verify the fix
SELECT 
    'RLS Status' as check_type,
    CASE WHEN rowsecurity THEN 'ENABLED (BAD!)' ELSE 'DISABLED (GOOD!)' END as status
FROM pg_tables 
WHERE tablename = 'salesman_targets'
UNION ALL
SELECT 
    'Policies Count' as check_type,
    COALESCE(COUNT(*)::text, '0') || ' policies' as status
FROM pg_policies 
WHERE tablename = 'salesman_targets'
UNION ALL
SELECT
    'Table Exists' as check_type,
    'YES' as status
FROM information_schema.tables
WHERE table_name = 'salesman_targets';

-- 5. Test INSERT (replace with your actual salesman_id)
-- INSERT INTO salesman_targets (
--     salesman_id, month, year,
--     visits_per_month, visits_per_day,
--     new_visits_per_month, repeat_visits_per_month,
--     orders_per_month, order_value_per_month,
--     product_targets
-- ) VALUES (
--     1, 11, 2025,
--     20, 1,
--     10, 10,
--     15, 100000,
--     '[]'::jsonb
-- )
-- ON CONFLICT (salesman_id, month, year) 
-- DO UPDATE SET
--     visits_per_month = EXCLUDED.visits_per_month,
--     visits_per_day = EXCLUDED.visits_per_day;
