-- =====================================================
-- MULTI-TENANT MIGRATION SCRIPT
-- =====================================================
-- This script converts the single-tenant FSM system to multi-tenant
-- Run this in Supabase SQL Editor

-- =====================================================
-- STEP 1: CREATE TENANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#1976d2',
  secondary_color VARCHAR(7) DEFAULT '#dc004e',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_plan VARCHAR(50) DEFAULT 'basic',
  subscription_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster slug lookups
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_active ON tenants(is_active);

-- =====================================================
-- STEP 2: CREATE DEFAULT TENANT (EXISTING DATA)
-- =====================================================

-- Create a default tenant for existing data
INSERT INTO tenants (
  id,
  name,
  slug,
  company_name,
  primary_color,
  secondary_color,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'SAK Solution',
  'sak',
  'SAK Solution',
  '#1976d2',
  '#dc004e',
  true
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 3: ADD TENANT_ID TO EXISTING TABLES
-- =====================================================

-- Add tenant_id to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to salesmen table
ALTER TABLE salesmen 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to visits table
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to targets table (if exists)
ALTER TABLE targets 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- =====================================================
-- STEP 4: BACKFILL EXISTING DATA WITH DEFAULT TENANT
-- =====================================================

-- Update all existing users with default tenant
UPDATE users 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Update all existing salesmen with default tenant
UPDATE salesmen 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Update all existing customers with default tenant
UPDATE customers 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Update all existing visits with default tenant
UPDATE visits 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Update all existing products with default tenant
UPDATE products 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Update all existing targets with default tenant
UPDATE targets 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- =====================================================
-- STEP 5: MAKE TENANT_ID NOT NULL
-- =====================================================

ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE salesmen ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE visits ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE targets ALTER COLUMN tenant_id SET NOT NULL;

-- =====================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_salesmen_tenant_id ON salesmen(tenant_id);
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_visits_tenant_id ON visits(tenant_id);
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_targets_tenant_id ON targets(tenant_id);

-- Composite indexes for common queries
CREATE INDEX idx_users_tenant_phone ON users(tenant_id, phone);
CREATE INDEX idx_salesmen_tenant_phone ON salesmen(tenant_id, phone);
CREATE INDEX idx_visits_tenant_salesman ON visits(tenant_id, salesman_id);
CREATE INDEX idx_customers_tenant_phone ON customers(tenant_id, phone);

-- =====================================================
-- STEP 7: ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate with tenant context
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Salesmen can view their own data" ON salesmen;
DROP POLICY IF EXISTS "Everyone can view active products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;

-- =====================================================
-- STEP 8: CREATE TENANT-AWARE RLS POLICIES
-- =====================================================

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Tenants policies
CREATE POLICY "Users can view their own tenant"
ON tenants FOR SELECT
USING (id = get_user_tenant_id());

CREATE POLICY "Admins can update their tenant"
ON tenants FOR UPDATE
USING (
  id = get_user_tenant_id() AND
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Users policies
CREATE POLICY "Users can view own tenant users"
ON users FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert own tenant users"
ON users FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update own data"
ON users FOR UPDATE
USING (id = auth.uid() OR tenant_id = get_user_tenant_id());

-- Salesmen policies
CREATE POLICY "Users can view own tenant salesmen"
ON salesmen FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage own tenant salesmen"
ON salesmen FOR ALL
USING (
  tenant_id = get_user_tenant_id() AND
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Customers policies
CREATE POLICY "Users can view own tenant customers"
ON customers FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can manage own tenant customers"
ON customers FOR ALL
USING (tenant_id = get_user_tenant_id());

-- Visits policies
CREATE POLICY "Users can view own tenant visits"
ON visits FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert own tenant visits"
ON visits FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update own tenant visits"
ON visits FOR UPDATE
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete own tenant visits"
ON visits FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- Products policies
CREATE POLICY "Users can view own tenant products"
ON products FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert own tenant products"
ON products FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update own tenant products"
ON products FOR UPDATE
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete own tenant products"
ON products FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- Targets policies
CREATE POLICY "Users can view own tenant targets"
ON targets FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage own tenant targets"
ON targets FOR ALL
USING (
  tenant_id = get_user_tenant_id() AND
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- =====================================================
-- STEP 9: CREATE TENANT MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to create a new tenant
CREATE OR REPLACE FUNCTION create_tenant(
  p_name VARCHAR(255),
  p_slug VARCHAR(100),
  p_company_name VARCHAR(255),
  p_contact_email VARCHAR(255) DEFAULT NULL,
  p_contact_phone VARCHAR(20) DEFAULT NULL,
  p_primary_color VARCHAR(7) DEFAULT '#1976d2',
  p_secondary_color VARCHAR(7) DEFAULT '#dc004e'
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  INSERT INTO tenants (
    name,
    slug,
    company_name,
    contact_email,
    contact_phone,
    primary_color,
    secondary_color,
    is_active
  ) VALUES (
    p_name,
    p_slug,
    p_company_name,
    p_contact_email,
    p_contact_phone,
    p_primary_color,
    p_secondary_color,
    true
  ) RETURNING id INTO v_tenant_id;
  
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tenant by slug
CREATE OR REPLACE FUNCTION get_tenant_by_slug(p_slug VARCHAR(100))
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  slug VARCHAR(100),
  company_name VARCHAR(255),
  logo_url TEXT,
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.company_name,
    t.logo_url,
    t.primary_color,
    t.secondary_color,
    t.contact_email,
    t.contact_phone,
    t.address,
    t.is_active
  FROM tenants t
  WHERE t.slug = p_slug AND t.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 10: CREATE SAMPLE TENANTS (FOR TESTING)
-- =====================================================

-- You can create additional sample tenants here
-- Example:
/*
INSERT INTO tenants (name, slug, company_name, primary_color, secondary_color)
VALUES 
  ('Acme Corp', 'acme', 'Acme Corporation', '#FF5722', '#FFC107'),
  ('TechCo', 'techco', 'TechCo Industries', '#3F51B5', '#00BCD4')
ON CONFLICT (slug) DO NOTHING;
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify migration
DO $$
DECLARE
  tenant_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tenant_count FROM tenants;
  SELECT COUNT(*) INTO user_count FROM users WHERE tenant_id IS NOT NULL;
  
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Total tenants: %', tenant_count;
  RAISE NOTICE 'Total users with tenant_id: %', user_count;
END $$;

-- Display tenant information
SELECT 
  id,
  name,
  slug,
  company_name,
  is_active,
  created_at
FROM tenants
ORDER BY created_at;
