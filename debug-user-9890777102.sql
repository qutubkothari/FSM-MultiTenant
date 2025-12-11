-- Debug user 9890777102 visit history issue
-- Run this in Supabase SQL Editor

-- 1. Check if user exists
SELECT * FROM users WHERE phone LIKE '%9890777102%';

-- 2. Check if salesman record exists
SELECT * FROM salesmen WHERE phone LIKE '%9890777102%';

-- 3. Check all visits for this salesman
SELECT 
    v.*,
    s.name as salesman_name,
    s.phone as salesman_phone,
    c.name as customer_name
FROM visits v
LEFT JOIN salesmen s ON v.salesman_id = s.id
LEFT JOIN customers c ON v.customer_id = c.id
WHERE s.phone LIKE '%9890777102%'
ORDER BY v.created_at DESC;

-- 4. If no salesman record exists, create one:
-- First get the user_id
-- Then insert salesman record
-- UNCOMMENT AND RUN IF NEEDED:
/*
INSERT INTO salesmen (name, phone, is_active, tenant_id, user_id)
SELECT 
    name,
    phone,
    true,
    tenant_id,
    id
FROM users 
WHERE phone LIKE '%9890777102%'
ON CONFLICT (phone) DO NOTHING;
*/

-- 5. Check if visits exist but salesman_id is NULL
SELECT * FROM visits WHERE salesman_name LIKE '%9890777102%';
