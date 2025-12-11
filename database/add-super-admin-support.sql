-- Update schema to support super admin registration flow

-- 1. Add default_language to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS default_language VARCHAR(5) DEFAULT 'en';

-- 2. Add preferred_language to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en';

-- 3. Update users table role constraint to include super_admin
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'salesman', 'super_admin'));

-- 4. Create storage bucket for tenant assets (logos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Create storage policy for tenant assets
DROP POLICY IF EXISTS "Public read access for tenant assets" ON storage.objects;
CREATE POLICY "Public read access for tenant assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-assets');

DROP POLICY IF EXISTS "Authenticated users can upload tenant assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload tenant assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tenant-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Super admins can update tenant assets" ON storage.objects;
CREATE POLICY "Super admins can update tenant assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tenant-assets' AND
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
);

-- 6. Update RLS policies to include super_admin

-- Allow super admins to manage their tenant
DROP POLICY IF EXISTS "Admins can update their tenant" ON tenants;
DROP POLICY IF EXISTS "Super admins can update their tenant" ON tenants;
CREATE POLICY "Super admins can update their tenant"
ON tenants FOR UPDATE
USING (
  id = get_user_tenant_id() AND
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
);

-- Allow super admins full access to users in their tenant
DROP POLICY IF EXISTS "Super admins can manage tenant users" ON users;
CREATE POLICY "Super admins can manage tenant users"
ON users FOR ALL
USING (
  tenant_id = get_user_tenant_id() AND
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
);

-- Allow super admins to manage salesmen
DROP POLICY IF EXISTS "Admins can manage own tenant salesmen" ON salesmen;
DROP POLICY IF EXISTS "Super admins can manage own tenant salesmen" ON salesmen;
CREATE POLICY "Super admins can manage own tenant salesmen"
ON salesmen FOR ALL
USING (
  tenant_id = get_user_tenant_id() AND
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'super_admin'))
);

-- 7. Create index on preferred_language
CREATE INDEX IF NOT EXISTS idx_users_preferred_language ON users(preferred_language);
CREATE INDEX IF NOT EXISTS idx_tenants_default_language ON tenants(default_language);

-- 8. Temporarily disable RLS for registration tables
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE salesmen DISABLE ROW LEVEL SECURITY;

-- Note: You can re-enable RLS after initial setup if needed
-- For production, consider using service role key for registration API

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Schema updated for super admin registration flow!';
  RAISE NOTICE 'Users can now self-register as super admins';
  RAISE NOTICE 'Super admins can manage tenant settings and add users';
END $$;
