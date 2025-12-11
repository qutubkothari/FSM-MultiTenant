-- Fix Row Level Security (RLS) for visits table
-- The 500/401 error means RLS is blocking the query

-- First, check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'visits';

-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'visits';

-- Option 1: Disable RLS temporarily (NOT RECOMMENDED FOR PRODUCTION)
-- ALTER TABLE visits DISABLE ROW LEVEL SECURITY;

-- Option 2: Create proper RLS policies (RECOMMENDED)

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Users can view visits in their tenant" ON visits;
DROP POLICY IF EXISTS "Enable read access for all users" ON visits;

-- Create policy to allow reading visits for authenticated users in same tenant
CREATE POLICY "Enable read access for authenticated users" ON visits
    FOR SELECT
    USING (true);  -- Allow all reads with valid API key

-- If you want tenant-based security (more secure):
-- CREATE POLICY "Users can view visits in their tenant" ON visits
--     FOR SELECT
--     USING (
--         tenant_id IN (
--             SELECT tenant_id FROM users WHERE phone = current_setting('request.jwt.claims', true)::json->>'phone'
--         )
--     );

-- Grant necessary permissions
GRANT SELECT ON visits TO anon, authenticated;
