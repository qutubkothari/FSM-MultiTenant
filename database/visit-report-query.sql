-- Visit Report: Company and Salesman-wise with Date Range
-- This query extracts visit details grouped by tenant (company), salesman, and date
-- Showing total visits, visit types, and customer details

-- Basic Visit Count Report (Daily)
SELECT 
    t.company_name,
    t.id as tenant_id,
    s.name as salesman_name,
    s.phone as salesman_phone,
    DATE(v.created_at) as visit_date,
    COUNT(v.id) as total_visits,
    COUNT(CASE WHEN v.customer_type = 'new' THEN 1 END) as new_customers,
    COUNT(CASE WHEN v.customer_type = 'repeat' THEN 1 END) as repeat_customers,
    COUNT(CASE WHEN v.visit_type = 'meeting' THEN 1 END) as meetings,
    COUNT(CASE WHEN v.visit_type = 'site_visit' THEN 1 END) as site_visits,
    SUM(COALESCE(v.order_value, 0)) as total_order_value
FROM visits v
INNER JOIN salesmen s ON v.salesman_id = s.id
INNER JOIN tenants t ON v.tenant_id = t.id
WHERE t.company_name ILIKE '%hylite%'  -- Filter for Hylite company
    AND v.deleted_at IS NULL  -- Exclude soft-deleted visits
    -- Optional: Add date range filter
    -- AND v.created_at >= '2025-01-01'
    -- AND v.created_at < '2026-01-01'
GROUP BY t.company_name, t.id, s.name, s.phone, DATE(v.created_at)
ORDER BY visit_date DESC, t.company_name, s.name;


-- Detailed Visit List with Customer Information
SELECT 
    t.company_name,
    s.name as salesman_name,
    DATE(v.created_at) as visit_date,
    TO_CHAR(v.created_at, 'HH24:MI:SS') as visit_time,
    v.customer_name,
    v.customer_email,
    v.customer_type,
    v.contact_person,
    v.visit_type,
    v.meeting_type,
    v.potential,
    v.order_value,
    v.next_action,
    v.next_action_date,
    v.location_address,
    v.remarks
FROM visits v
INNER JOIN salesmen s ON v.salesman_id = s.id
INNER JOIN tenants t ON v.tenant_id = t.id
WHERE t.company_name ILIKE '%hylite%'
    AND v.deleted_at IS NULL
    -- Optional: Add date range filter
    -- AND v.created_at >= '2025-12-01'
    -- AND v.created_at < '2025-12-31'
ORDER BY v.created_at DESC, s.name;


-- Monthly Summary Report
SELECT 
    t.company_name,
    s.name as salesman_name,
    TO_CHAR(v.created_at, 'YYYY-MM') as month,
    COUNT(v.id) as total_visits,
    COUNT(DISTINCT v.customer_name) as unique_customers,
    COUNT(CASE WHEN v.customer_type = 'new' THEN 1 END) as new_customers,
    COUNT(CASE WHEN v.customer_type = 'repeat' THEN 1 END) as repeat_customers,
    ROUND(AVG(v.order_value), 2) as avg_order_value,
    SUM(COALESCE(v.order_value, 0)) as total_order_value,
    COUNT(CASE WHEN v.potential = 'High' THEN 1 END) as high_potential_visits,
    COUNT(CASE WHEN v.next_action_date IS NOT NULL THEN 1 END) as followup_required
FROM visits v
INNER JOIN salesmen s ON v.salesman_id = s.id
INNER JOIN tenants t ON v.tenant_id = t.id
WHERE t.company_name ILIKE '%hylite%'
    AND v.deleted_at IS NULL
GROUP BY t.company_name, s.name, TO_CHAR(v.created_at, 'YYYY-MM')
ORDER BY month DESC, s.name;


-- Salesman Performance Summary (All Time)
SELECT 
    t.company_name,
    s.name as salesman_name,
    s.phone as salesman_phone,
    COUNT(v.id) as total_visits,
    COUNT(DISTINCT DATE(v.created_at)) as active_days,
    ROUND(COUNT(v.id)::numeric / NULLIF(COUNT(DISTINCT DATE(v.created_at)), 0), 2) as avg_visits_per_day,
    COUNT(DISTINCT v.customer_name) as unique_customers,
    SUM(COALESCE(v.order_value, 0)) as total_revenue,
    COUNT(CASE WHEN v.potential = 'High' THEN 1 END) as high_potential_visits,
    MIN(DATE(v.created_at)) as first_visit_date,
    MAX(DATE(v.created_at)) as last_visit_date
FROM visits v
INNER JOIN salesmen s ON v.salesman_id = s.id
INNER JOIN tenants t ON v.tenant_id = t.id
WHERE t.company_name ILIKE '%hylite%'
    AND v.deleted_at IS NULL
GROUP BY t.company_name, s.name, s.phone
ORDER BY total_visits DESC;
