-- ============================================
-- Setup Storage Bucket for Tenant Logos
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create the tenant-assets bucket if it doesn't exist
-- Note: You may need to create this in the Supabase Storage UI first
-- Storage > Create bucket > Name: tenant-assets > Public: true

-- 2. Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view tenant logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload tenant logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update tenant logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete tenant logos" ON storage.objects;

-- 3. Create RLS policies for tenant-assets bucket

-- Allow public read access to tenant logos
CREATE POLICY "Public can view tenant logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-assets');

-- Allow authenticated admins to upload logos for their tenant
CREATE POLICY "Admins can upload tenant logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tenant-assets' 
  AND auth.uid() IN (
    SELECT id::text::uuid 
    FROM users 
    WHERE role = 'admin'
  )
);

-- Allow authenticated admins to update logos for their tenant
CREATE POLICY "Admins can update tenant logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tenant-assets' 
  AND auth.uid() IN (
    SELECT id::text::uuid 
    FROM users 
    WHERE role = 'admin'
  )
);

-- Allow authenticated admins to delete logos for their tenant
CREATE POLICY "Admins can delete tenant logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tenant-assets' 
  AND auth.uid() IN (
    SELECT id::text::uuid 
    FROM users 
    WHERE role = 'admin'
  )
);

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%tenant%';
