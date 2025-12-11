-- Check if salesmen table exists and its structure
SELECT 
    table_name,
    'EXISTS' as status
FROM information_schema.tables
WHERE table_name IN ('salesmen', 'users', 'salesman_targets')
ORDER BY table_name;

-- Check salesmen table columns if it exists
SELECT 
    'salesmen' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'salesmen'
ORDER BY ordinal_position;

-- Check if salesman_targets references salesmen or users
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'salesman_targets';

-- Show data from salesman_targets with actual values
SELECT 
    id,
    salesman_id,
    month,
    year,
    visits_per_month,
    visits_per_day,
    new_visits_per_month,
    repeat_visits_per_month,
    orders_per_month,
    order_value_per_month
FROM salesman_targets
LIMIT 5;
