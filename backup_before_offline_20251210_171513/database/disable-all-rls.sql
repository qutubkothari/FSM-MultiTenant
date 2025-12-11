-- Disable RLS on ALL tables to allow super admin operations
-- This is required for multi-tenant setup where we handle isolation in application logic

ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE salesmen DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE salesman_targets DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    tablename,
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('tenants', 'users', 'salesmen', 'customers', 'products', 'visits', 'salesman_targets')
ORDER BY tablename;
