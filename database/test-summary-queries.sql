-- Test Queries for WhatsApp Summary System
-- Run these in Supabase SQL Editor to verify everything works

-- ==============================================
-- 1. CHECK IF YOU HAVE VISIT DATA
-- ==============================================
SELECT 
    DATE(created_at) as visit_date,
    COUNT(*) as total_visits,
    COUNT(DISTINCT salesman_id) as active_salesmen
FROM visits
WHERE deleted_at IS NULL
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY visit_date DESC;

-- ==============================================
-- 2. FIND DATES WITH MOST VISITS
-- ==============================================
SELECT 
    DATE(v.created_at) as visit_date,
    s.name as salesman_name,
    s.phone,
    COUNT(v.id) as visits,
    SUM(COALESCE(v.order_value, 0)) as revenue
FROM visits v
INNER JOIN salesmen s ON v.salesman_id = s.id
WHERE v.deleted_at IS NULL
    AND v.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(v.created_at), s.name, s.phone
HAVING COUNT(v.id) > 0
ORDER BY visit_date DESC, visits DESC
LIMIT 10;

-- ==============================================
-- 3. TEST DAILY SALESMAN SUMMARY (WITH DATA)
-- ==============================================
-- Replace the date with a date from query #2 above
SELECT get_daily_salesman_summary(
    'b4cc8d15-2099-43e2-b1f8-435e31b69658', -- Alok's ID
    '2025-12-14' -- Replace with date that has visits
);

-- ==============================================
-- 4. TEST FOR ALL SALESMEN ON A SPECIFIC DATE
-- ==============================================
SELECT 
    s.name,
    (get_daily_salesman_summary(s.id, '2025-12-14'))::json->>'total_visits' as visits,
    (get_daily_salesman_summary(s.id, '2025-12-14'))::json->>'new_customers' as new_customers,
    (get_daily_salesman_summary(s.id, '2025-12-14'))::json->>'total_order_value' as revenue
FROM salesmen s
WHERE s.deleted_at IS NULL
    AND s.is_active = true
ORDER BY s.name;

-- ==============================================
-- 5. TEST ADMIN SUMMARY (FIND TENANT ID FIRST)
-- ==============================================
-- Find your tenant ID
SELECT id, company_name FROM tenants LIMIT 5;

-- Test admin summary (replace tenant_id)
SELECT get_daily_admin_summary(
    (SELECT id FROM tenants LIMIT 1),
    '2025-12-14' -- Replace with date that has visits
);

-- ==============================================
-- 6. PREVIEW FORMATTED MESSAGE
-- ==============================================
-- This shows exactly what the WhatsApp message will look like
WITH summary AS (
    SELECT get_daily_salesman_summary(
        'b4cc8d15-2099-43e2-b1f8-435e31b69658',
        '2025-12-14'
    ) as data
)
SELECT 
    '📊 *Daily Summary - ' || TO_CHAR((data::json->>'date')::date, 'DD Mon YYYY') || '*

Hi ' || (data::json->>'name') || ',

✅ *Today''s Performance:*
🎯 Total Visits: ' || (data::json->>'total_visits') || '
✨ New Customers: ' || (data::json->>'new_customers') || '
🔄 Repeat Customers: ' || (data::json->>'repeat_customers') || '
💰 Total Orders: ₹' || (data::json->>'total_order_value')::numeric::text || '
' || CASE 
    WHEN (data::json->>'high_potential_visits')::int > 0 
    THEN '⭐ High Potential Visits: ' || (data::json->>'high_potential_visits') || E'\n'
    ELSE '' 
END || CASE 
    WHEN (data::json->>'pending_followups')::int > 0 
    THEN '📅 Pending Follow-ups: ' || (data::json->>'pending_followups') || E'\n'
    ELSE '' 
END || '
Keep up the great work! 💪

_Automated by FSM System_' as whatsapp_message
FROM summary;

-- ==============================================
-- 7. CREATE TEST VISIT FOR TODAY (OPTIONAL)
-- ==============================================
-- Uncomment and run this to create a test visit for today
/*
INSERT INTO visits (
    salesman_id,
    tenant_id,
    customer_name,
    customer_type,
    contact_person,
    phone,
    visit_type,
    meeting_type,
    potential,
    order_value,
    remarks,
    location_address,
    location_lat,
    location_lng,
    created_at
) VALUES (
    'b4cc8d15-2099-43e2-b1f8-435e31b69658', -- Alok's ID
    (SELECT tenant_id FROM salesmen WHERE id = 'b4cc8d15-2099-43e2-b1f8-435e31b69658'),
    'Test Customer Ltd',
    'new',
    'Mr. Test',
    '9876543210',
    'meeting',
    'product_demo',
    'High',
    25000,
    'Test visit for WhatsApp summary',
    'Mumbai, Maharashtra',
    19.0760,
    72.8777,
    CURRENT_TIMESTAMP
);
*/

-- Then test again:
-- SELECT get_daily_salesman_summary('b4cc8d15-2099-43e2-b1f8-435e31b69658', CURRENT_DATE);

-- ==============================================
-- 8. WEEKLY SUMMARY TEST
-- ==============================================
SELECT get_weekly_salesman_summary(
    'b4cc8d15-2099-43e2-b1f8-435e31b69658',
    date_trunc('week', CURRENT_DATE)::DATE
);

-- ==============================================
-- 9. CHECK WHATSAPP MESSAGE LOG
-- ==============================================
SELECT 
    recipient_phone,
    message_type,
    status,
    LEFT(message_content, 100) as message_preview,
    sent_at,
    error_message
FROM whatsapp_message_log
ORDER BY created_at DESC
LIMIT 10;

-- ==============================================
-- 10. FULL ADMIN REPORT WITH FORMATTED MESSAGE
-- ==============================================
WITH admin_summary AS (
    SELECT get_daily_admin_summary(
        (SELECT id FROM tenants LIMIT 1),
        '2025-12-14'
    ) as data
)
SELECT 
    '📈 *Daily Team Report - ' || TO_CHAR((data::json->>'date')::date, 'DD Mon YYYY') || '*

Hello Admin,

*Overall Performance:*
👥 Active Salesmen: ' || (data::json->>'active_salesmen') || '
🎯 Total Visits: ' || (data::json->>'total_visits') || '
✨ New Customers: ' || (data::json->>'new_customers') || '
💰 Total Revenue: ₹' || (data::json->>'total_order_value')::numeric::text || '

*Top Performers:*
' || COALESCE(
    (SELECT string_agg('🏆 ' || (p->>'name') || ': ' || (p->>'visits') || ' visits, ₹' || (p->>'revenue')::numeric::text, E'\n')
     FROM json_array_elements((data::json->'top_performers')::json) p),
    'No visits recorded'
) || '

_FSM Management System_' as admin_whatsapp_message
FROM admin_summary;
