-- Fix SQL functions to EXCLUDE admins from visit counts
-- Admins don't do field visits, only salesmen do

-- 1. Fix get_daily_admin_summary
DROP FUNCTION IF EXISTS get_daily_admin_summary(UUID, DATE);

CREATE OR REPLACE FUNCTION get_daily_admin_summary(
    p_tenant_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON AS $$
DECLARE
    summary JSONB;
    top_performers JSONB;
    alerts JSONB;
BEGIN
    -- Main summary (ONLY count salesmen, not admins)
    SELECT jsonb_build_object(
        'tenant_id', p_tenant_id,
        'date', p_date,
        'active_salesmen', COUNT(DISTINCT v.salesman_id),
        'total_visits', COUNT(v.id),
        'new_customers', COUNT(CASE WHEN v.customer_type = 'new' THEN 1 END),
        'repeat_customers', COUNT(CASE WHEN v.customer_type = 'repeat' THEN 1 END),
        'total_order_value', COALESCE(SUM(v.order_value), 0),
        'high_potential_visits', COUNT(CASE WHEN v.potential = 'High' THEN 1 END),
        'unique_customers', COUNT(DISTINCT v.customer_name),
        'avg_order_value', COALESCE(ROUND(AVG(v.order_value), 2), 0)
    ) INTO summary
    FROM visits v
    INNER JOIN salesmen s ON v.salesman_id = s.id
    WHERE v.tenant_id = p_tenant_id
        AND DATE(v.created_at) = p_date
        AND v.deleted_at IS NULL
        AND s.is_admin = false  -- EXCLUDE ADMIN VISITS
        AND s.deleted_at IS NULL;
    
    -- Top 3 performers (ONLY salesmen)
    SELECT jsonb_agg(performer ORDER BY total_visits DESC)
    INTO top_performers
    FROM (
        SELECT 
            jsonb_build_object(
                'name', s.name,
                'visits', COUNT(v.id),
                'revenue', COALESCE(SUM(v.order_value), 0)
            ) as performer,
            COUNT(v.id) as total_visits
        FROM salesmen s
        LEFT JOIN visits v ON s.id = v.salesman_id 
            AND DATE(v.created_at) = p_date
            AND v.deleted_at IS NULL
        WHERE s.tenant_id = p_tenant_id
            AND s.deleted_at IS NULL
            AND s.is_admin = false  -- EXCLUDE ADMINS
        GROUP BY s.id, s.name
        HAVING COUNT(v.id) > 0
        ORDER BY COUNT(v.id) DESC
        LIMIT 3
    ) perf;
    
    -- Alerts (ALL salesmen with 0 visits today - ONLY salesmen, NO admins)
    SELECT jsonb_agg(jsonb_build_object(
        'message', alert.name || ' - No visits today'
    ))
    INTO alerts
    FROM (
        SELECT s.name
        FROM salesmen s
        LEFT JOIN visits v ON s.id = v.salesman_id 
            AND DATE(v.created_at) = p_date
            AND v.deleted_at IS NULL
        WHERE s.tenant_id = p_tenant_id
            AND s.deleted_at IS NULL
            AND s.is_active = true
            AND (s.is_admin = false OR s.is_admin IS NULL)  -- EXCLUDE ADMINS (handle NULL too)
        GROUP BY s.id, s.name
        HAVING COUNT(v.id) = 0
        ORDER BY s.name
    ) alert;
    
    -- Combine all (using JSONB concatenation)
    summary := summary || jsonb_build_object(
        'top_performers', COALESCE(top_performers, '[]'::jsonb),
        'alerts', COALESCE(alerts, '[]'::jsonb)
    );
    
    RETURN summary::json;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix get_weekly_salesman_summary (already excludes admins via parameter)
-- No changes needed - it's called per salesman

-- 3. Fix get_monthly_admin_summary
DROP FUNCTION IF EXISTS get_monthly_admin_summary(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_monthly_admin_summary(
    p_tenant_id UUID,
    p_month INTEGER,
    p_year INTEGER
) RETURNS JSON AS $$
DECLARE
    summary JSONB;
    top_performers JSONB;
    growth JSONB;
BEGIN
    -- Main summary (ONLY salesmen)
    SELECT jsonb_build_object(
        'tenant_id', p_tenant_id,
        'month', p_month,
        'year', p_year,
        'total_visits', COUNT(v.id),
        'total_revenue', COALESCE(SUM(v.order_value), 0),
        'avg_daily_visits', ROUND(COUNT(v.id)::numeric / EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1)) + INTERVAL '1 month - 1 day'))::numeric, 2),
        'new_customers', COUNT(CASE WHEN v.customer_type = 'new' THEN 1 END),
        'repeat_customers', COUNT(CASE WHEN v.customer_type = 'repeat' THEN 1 END),
        'high_potential_conversions', COUNT(CASE WHEN v.potential = 'High' AND v.order_value > 0 THEN 1 END)
    ) INTO summary
    FROM visits v
    INNER JOIN salesmen s ON v.salesman_id = s.id
    WHERE v.tenant_id = p_tenant_id
        AND EXTRACT(MONTH FROM v.created_at) = p_month
        AND EXTRACT(YEAR FROM v.created_at) = p_year
        AND v.deleted_at IS NULL
        AND s.is_admin = false  -- EXCLUDE ADMINS
        AND s.deleted_at IS NULL;
    
    -- Top performers (ONLY salesmen)
    SELECT jsonb_agg(performer ORDER BY revenue DESC)
    INTO top_performers
    FROM (
        SELECT 
            jsonb_build_object(
                'name', s.name,
                'visits', COUNT(v.id),
                'revenue', COALESCE(SUM(v.order_value), 0)
            ) as performer,
            SUM(v.order_value) as revenue
        FROM salesmen s
        LEFT JOIN visits v ON s.id = v.salesman_id 
            AND EXTRACT(MONTH FROM v.created_at) = p_month
            AND EXTRACT(YEAR FROM v.created_at) = p_year
            AND v.deleted_at IS NULL
        WHERE s.tenant_id = p_tenant_id
            AND s.deleted_at IS NULL
            AND s.is_admin = false  -- EXCLUDE ADMINS
        GROUP BY s.id, s.name
        HAVING COUNT(v.id) > 0
        ORDER BY SUM(v.order_value) DESC
        LIMIT 5
    ) perf;
    
    -- Month-over-month growth
    WITH prev_month AS (
        SELECT COUNT(v.id) as visits, SUM(v.order_value) as revenue
        FROM visits v
        INNER JOIN salesmen s ON v.salesman_id = s.id
        WHERE v.tenant_id = p_tenant_id
            AND v.deleted_at IS NULL
            AND s.is_admin = false  -- EXCLUDE ADMINS
            AND s.deleted_at IS NULL
            AND ((p_month = 1 AND EXTRACT(MONTH FROM v.created_at) = 12 AND EXTRACT(YEAR FROM v.created_at) = p_year - 1)
                OR (p_month > 1 AND EXTRACT(MONTH FROM v.created_at) = p_month - 1 AND EXTRACT(YEAR FROM v.created_at) = p_year))
    )
    SELECT jsonb_build_object(
        'visits_growth', CASE 
            WHEN prev_month.visits > 0 
            THEN ROUND((((summary->>'total_visits')::numeric - prev_month.visits) / prev_month.visits * 100), 2)
            ELSE 0 
        END,
        'revenue_growth', CASE 
            WHEN prev_month.revenue > 0 
            THEN ROUND((((summary->>'total_revenue')::numeric - prev_month.revenue) / prev_month.revenue * 100), 2)
            ELSE 0 
        END
    ) INTO growth
    FROM prev_month;
    
    -- Combine all
    summary := summary || jsonb_build_object(
        'top_performers', COALESCE(top_performers, '[]'::jsonb),
        'growth', growth
    );
    
    RETURN summary::json;
END;
$$ LANGUAGE plpgsql;

-- Test the functions
SELECT get_daily_admin_summary(
    (SELECT id FROM tenants WHERE company_name ILIKE '%hylite%' LIMIT 1),
    '2025-12-12'
);
