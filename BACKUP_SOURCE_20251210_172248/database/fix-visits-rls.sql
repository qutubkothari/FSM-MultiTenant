-- Fix RLS policies for visits table to allow admin access
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Salesmen can view their own visits" ON visits;
DROP POLICY IF EXISTS "Salesmen can create visits" ON visits;
DROP POLICY IF EXISTS "Salesmen can update their own visits" ON visits;
DROP POLICY IF EXISTS salesmen_visits_policy ON visits;

-- Create new policies that allow both salesmen and admin access

-- Allow anyone to view all visits (for admin dashboard)
CREATE POLICY "Allow read access to visits" ON visits
    FOR SELECT
    USING (true);

-- Allow anyone to insert visits
CREATE POLICY "Allow insert visits" ON visits
    FOR INSERT
    WITH CHECK (true);

-- Allow anyone to update visits
CREATE POLICY "Allow update visits" ON visits
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Allow anyone to delete visits (for admin)
CREATE POLICY "Allow delete visits" ON visits
    FOR DELETE
    USING (true);

-- Verify RLS is enabled
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON visits TO anon;
GRANT ALL ON visits TO authenticated;
