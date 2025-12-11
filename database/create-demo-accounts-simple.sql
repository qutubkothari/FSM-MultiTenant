-- =====================================================
-- CREATE DEMO TEST ACCOUNTS (SIMPLE VERSION)
-- =====================================================
-- This creates demo accounts using the new DEMO tenant
-- Tenant ID: aaaaaaaa-bbbb-cccc-dddd-000000000001

-- Step 1: Create demo users
-- Delete existing demo users first (if they exist)
DELETE FROM users WHERE phone IN ('8484830021', '8484830022');

-- Delete from salesmen only if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'salesmen') THEN
        DELETE FROM salesmen WHERE phone IN ('8484830021', '8484830022');
    END IF;
END $$;

-- Super admin user
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
    'aaaaaaaa-bbbb-cccc-dddd-000000000001',
    NOW()
);

-- Salesman user
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
    'aaaaaaaa-bbbb-cccc-dddd-000000000001',
    NOW()
);

-- Step 2: Create salesman record (needed for creating visits)
-- Only if salesmen table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'salesmen') THEN
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
            false,
            true,
            'aaaaaaaa-bbbb-cccc-dddd-000000000001',
            ARRAY[]::text[],
            NOW()
        );
    END IF;
END $$;

-- Step 3: Create demo plants (companies/locations)
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

-- Step 4: Create demo products
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
    'Demo product for testing',
    'منتج تجريبي للاختبار',
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
    'Demo product for testing',
    'منتج تجريبي للاختبار',
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
    'Demo product for testing',
    'منتج تجريبي للاختبار',
    true,
    'aaaaaaaa-bbbb-cccc-dddd-000000000001',
    NOW()
);

-- Step 5: Verification queries
SELECT 
    '✅ Demo Users Created' as status,
    phone,
    name,
    role,
    is_active
FROM users 
WHERE phone IN ('8484830021', '8484830022')
ORDER BY role DESC;

SELECT 
    '✅ Demo Salesman Created' as status,
    phone,
    name,
    is_admin,
    is_active
FROM salesmen 
WHERE phone = '8484830022'
AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'salesmen');

SELECT 
    '✅ Demo Plants Created' as status,
    plant_code,
    plant_name,
    city
FROM plants 
WHERE plant_code IN ('SAK-DEMO-001', 'SAK-DEMO-002');

SELECT 
    '✅ Demo Products Created' as status,
    code,
    name,
    category
FROM products 
WHERE code IN ('DEMO-PROD-001', 'DEMO-PROD-002', 'DEMO-PROD-003');

-- =====================================================
-- TEST ACCOUNT CREDENTIALS
-- =====================================================
-- SUPER ADMIN:
--   Phone: 8484830021
--   Password: 515253
--   
-- SALESMAN:
--   Phone: 8484830022
--   Password: 515253
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
