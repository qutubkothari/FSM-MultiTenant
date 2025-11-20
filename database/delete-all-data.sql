-- Delete all data from all tables
-- Run this in Supabase SQL Editor

-- Delete visits first (due to foreign key constraints)
DELETE FROM visits;

-- Delete salesmen
DELETE FROM salesmen;

-- Delete users
DELETE FROM users;

-- Delete products
DELETE FROM products;

-- Delete salesman_targets (if table exists)
DELETE FROM salesman_targets;

-- Reset sequences (optional - to restart IDs from 1)
-- Note: Only works if using SERIAL/BIGSERIAL columns
-- ALTER SEQUENCE visits_id_seq RESTART WITH 1;
-- ALTER SEQUENCE salesmen_id_seq RESTART WITH 1;
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- ALTER SEQUENCE products_id_seq RESTART WITH 1;
-- ALTER SEQUENCE targets_id_seq RESTART WITH 1;

-- Verify all tables are empty
SELECT 'visits' as table_name, COUNT(*) as record_count FROM visits
UNION ALL
SELECT 'salesmen', COUNT(*) FROM salesmen
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'salesman_targets', COUNT(*) FROM salesman_targets;
