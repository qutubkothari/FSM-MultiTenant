-- FIX: WhatsApp reports showing 0 visits because JOIN on wrong table
-- Problem: Visits use salesman_id from 'salesmen' table, but reports JOIN on 'users' table
-- Solution: Query directly from visits.salesman_name column (already stored) OR update function to use salesmen table

-- QUICK FIX: Check if visits.salesman_name exists (it does from Check 18)
-- This query works NOW without any code changes:

SELECT 
  v.salesman_name,
  DATE(v.created_at) as visit_date,
  COUNT(*) as visit_count,
  STRING_AGG(DISTINCT v.customer_name, ', ') as customers_visited
FROM visits v
WHERE DATE(v.created_at) = CURRENT_DATE
  AND v.deleted_at IS NULL
GROUP BY v.salesman_name, DATE(v.created_at)
ORDER BY salesman_name;

-- ALTERNATIVE: Create a view that joins visits with salesmen table
CREATE OR REPLACE VIEW visits_with_salesman AS
SELECT 
  v.*,
  s.name as salesman_name_from_salesmen,
  s.phone as salesman_phone,
  s.email as salesman_email
FROM visits v
LEFT JOIN salesmen s ON v.salesman_id = s.id;

-- Test the view
SELECT 
  salesman_name_from_salesmen,
  DATE(created_at) as visit_date,
  COUNT(*) as visit_count
FROM visits_with_salesman
WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '7 days'
  AND deleted_at IS NULL
GROUP BY salesman_name_from_salesmen, DATE(created_at)
ORDER BY visit_date DESC, salesman_name_from_salesmen;
