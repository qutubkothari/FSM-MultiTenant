-- =====================================================
-- CREATE DEMO TENANT & TEST ACCOUNTS FOR OFFLINE SYNC TESTING
-- =====================================================
-- This creates a completely separate test environment
-- DOES NOT interfere with live client data
-- Run this in Supabase SQL Editor

-- Step 1: Create new demo tenant
INSERT INTO tenants (
    id,
    name,
    slug,
    company_name,
    is_active,
    subscription_plan,
    primary_color,
    secondary_color,
    default_language,
    translation_enabled,
    currency_code,
    currency_symbol,
    created_at
)
VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-000000000001',  -- Demo tenant ID
    'DEMO-TEST',
    'demo-test',
    'Demo Testing Company',
    true,
    'enterprise',
    '#1976d2',
    '#dc004e',
    'en',
    false,
    'INR',
    '₹',
    NOW()
)
ON CONFLICT (id) 
DO UPDATE SET
    name = EXCLUDED.name,
    is_active = true,
    updated_at = NOW();

-- Step 2: Create super admin user
-- Step 2: Create super admin user
INSERT INTO users (
    phone,
    password,
    name,
    name_ar,
    role,
    is_active,
    tenant_id,
    created_at
)
VALUES (
    '8484830021',
    '515253',
    'Demo Super Admin',
    'مسؤول تجريبي',
    'super_admin',
    true,
    'aaaaaaaa-bbbb-cccc-dddd-000000000001',  -- Demo tenant
    NOW()
)
ON CONFLICT (phone) 
DO UPDATE SET
    password = EXCLUDED.password,
    name = EXCLUDED.name,
    role = 'super_admin',
    is_active = true,
    tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001',
    updated_at = NOW();

-- Step 3: Create salesman user
INSERT INTO users (
    phone,
    password,
    name,
    name_ar,
    role,
    is_active,
    tenant_id,
    created_at
)
VALUES (
    '8484830022',
    '515253',
    'Demo Salesman',
    'مندوب تجريبي',
    'salesman',
    true,
    'aaaaaaaa-bbbb-cccc-dddd-000000000001',  -- Demo tenant
    NOW()
)
ON CONFLICT (phone) 
DO UPDATE SET
    password = EXCLUDED.password,
    name = EXCLUDED.name,
    role = 'salesman',
    is_active = true,
    tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001',
    updated_at = NOW();

-- Step 4: Create salesman record (needed for creating visits)
INSERT INTO salesmen (
    phone,
    name,
    name_ar,
    is_admin,
    is_active,
    tenant_id,
    plant,
    created_at
)
VALUES (
    '8484830022',
    'Demo Salesman',
    'مندوب تجريبي',
    false,  -- Regular salesman, not admin
    true,
    'aaaaaaaa-bbbb-cccc-dddd-000000000001',  -- Demo tenant
    ARRAY[]::text[],  -- Empty plant array, full access
    NOW()
)
ON CONFLICT (phone)
DO UPDATE SET
    name = EXCLUDED.name,
    is_admin = false,
    is_active = true,
    tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001',
    updated_at = NOW();

-- Step 5: Create demo plants (companies/locations)
-- First, delete any existing demo plants to avoid duplicates
DELETE FROM plants WHERE plant_code IN ('SAK-DEMO-001', 'SAK-DEMO-002');

INSERT INTO plants (
    plant_code,
    plant_name,
    plant_name_ar,
    area,
    area_ar,
    city,
    city_ar,
    tenant_id,
    created_at
)
VALUES 
(
    'SAK-DEMO-001',
    'SAK Demo Company',
    'شركة ساك التجريبية',
    'Demo Area',
    'منطقة تجريبية',
    'Demo City',
    'مدينة تجريبية',
    'aaaaaaaa-bbbb-cccc-dddd-000000000001',
    NOW()
),
(
    'SAK-DEMO-002',
    'SAK Demo Branch 2',
    'فرع ساك التجريبي ٢',
    'Demo Area 2',
    'منطقة تجريبية ٢',
    'Demo City 2',
    'مدينة تجريبية ٢',
    'aaaaaaaa-bbbb-cccc-dddd-000000000001',
    NOW()
);

-- Step 6: Create demo products
-- First, delete any existing demo products to avoid duplicates
DELETE FROM products WHERE code IN ('DEMO-PROD-001', 'DEMO-PROD-002', 'DEMO-PROD-003');
INSERT INTO products (
    code,
    name,
    name_ar,
    category,
    category_ar,
    description,
    description_ar,
    is_active,
    tenant_id,
    created_at
)
VALUES 
(
    'DEMO-PROD-001',
    'Demo Product 1',
    'منتج تجريبي ١',
    'Demo Category',
    'فئة تجريبية',
    'Demo product for testing offline sync',
    'منتج تجريبي لاختبار المزامنة',
    true,
    'aaaaaaaa-bbbb-cccc-dddd-000000000001',
    NOW()
),
(
    'DEMO-PROD-002',
    'Demo Product 2',
    'منتج تجريبي ٢',
    'Demo Category',
    'فئة تجريبية',
    'Demo product for testing offline sync',
    'منتج تجريبي لاختبار المزامنة',
    true,
    'aaaaaaaa-bbbb-cccc-dddd-000000000001',
    NOW()
),
(
    'DEMO-PROD-003',
    'Demo Product 3',
    'منتج تجريبي ٣',
    'Demo Category',
    'فئة تجريبية',
    'Demo product for testing offline sync',
    'منتج تجريبي لاختبار المزامنة',
    true,
    'aaaaaaaa-bbbb-cccc-dddd-000000000001',
    NOW()
);

-- Step 7: Verification queries
SELECT 
    '✅ Demo Tenant Created' as status,
    id,
    company_name,
    currency_code,
    currency_symbol
FROM tenants 
WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';

SELECT 
    '✅ Demo Users Created' as status,
    phone,
    name,
    role,
    tenant_id
FROM users 
WHERE phone IN ('8484830021', '8484830022')
ORDER BY role DESC;

SELECT 
    '✅ Demo Salesman Created' as status,
    phone,
    name,
    is_admin,
    tenant_id
FROM salesmen 
WHERE phone = '8484830022';

SELECT 
    '✅ Demo Plants Created' as status,
    plant_code,
    plant_name,
    city,
    tenant_id
FROM plants 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';

SELECT 
    '✅ Demo Products Created' as status,
    code,
    name,
    category,
    tenant_id
FROM products 
WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';

-- =====================================================
-- TEST ACCOUNT CREDENTIALS
-- =====================================================
-- SUPER ADMIN:
--   Phone: 8484830021
--   Password: 515253
--   Name: Demo Super Admin
--   Role: super_admin
--   Tenant: Demo Testing Company (new isolated tenant)
--   Access: Full admin rights
--
-- SALESMAN:
--   Phone: 8484830022
--   Password: 515253
--   Name: Demo Salesman
--   Role: salesman
--   Tenant: Demo Testing Company (new isolated tenant)
--   Access: Create visits, offline sync testing
--   
-- DEMO PLANTS (COMPANIES):
--   - SAK Demo Company (SAK-DEMO-001)
--   - SAK Demo Branch 2 (SAK-DEMO-002)
--
-- DEMO PRODUCTS:
--   - Demo Product 1 (DEMO-PROD-001)
--   - Demo Product 2 (DEMO-PROD-002)
--   - Demo Product 3 (DEMO-PROD-003)
-- =====================================================

-- Step 8: Cleanup (run this when you want to delete demo data)
/*
DELETE FROM visits WHERE salesman_id IN (
    SELECT id FROM salesmen WHERE tenant_id = 'aaaaaaaa-bbbb-ccbb-dddd-000000000001'
);
DELETE FROM products WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';
DELETE FROM plants WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';
DELETE FROM salesmen WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';
DELETE FROM users WHERE tenant_id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';
DELETE FROM tenants WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';
*/
