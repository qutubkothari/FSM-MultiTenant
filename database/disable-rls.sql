-- DISABLE RLS ON ALL TABLES
-- Run this in Supabase SQL Editor to fix slow loading issues
-- This allows all queries to work without RLS restrictions

-- Disable RLS on all tables
ALTER TABLE salesmen DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE salesman_targets DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON salesmen;
DROP POLICY IF EXISTS "Allow all operations for admin" ON salesmen;
DROP POLICY IF EXISTS "Allow read for all authenticated users" ON salesmen;
DROP POLICY IF EXISTS "Allow all for authenticated" ON salesmen;

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON customers;
DROP POLICY IF EXISTS "Allow all for authenticated" ON customers;

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON products;
DROP POLICY IF EXISTS "Allow all for authenticated" ON products;

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON visits;
DROP POLICY IF EXISTS "Allow all for authenticated" ON visits;

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON salesman_targets;
DROP POLICY IF EXISTS "Allow all for authenticated" ON salesman_targets;

-- Grant full access to anon and authenticated users
GRANT ALL ON salesmen TO anon, authenticated;
GRANT ALL ON customers TO anon, authenticated;
GRANT ALL ON products TO anon, authenticated;
GRANT ALL ON visits TO anon, authenticated;
GRANT ALL ON salesman_targets TO anon, authenticated;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
