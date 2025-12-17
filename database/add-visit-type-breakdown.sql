-- Update SQL functions to show visit type breakdown (personal visits vs telephone calls)

-- 1. Update get_daily_salesman_summary to include visit type breakdown
DROP FUNCTION IF EXISTS get_daily_salesman_summary(UUID, DATE);

CREATE OR REPLACE FUNCTION get_daily_salesman_summary(
    p_salesman_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'salesman_id', p_salesman_id,
        'name', s.name,
        'date', p_date,
        'total_visits', COUNT(v.id),
        'personal_visits', COUNT(CASE WHEN v.visit_type = 'personal' THEN 1 END),
        'telephone_calls', COUNT(CASE WHEN v.visit_type = 'telephone' THEN 1 END),
        'new_customers', COUNT(CASE WHEN v.customer_type = 'new' THEN 1 END),
        'repeat_customers', COUNT(CASE WHEN v.customer_type = 'repeat' THEN 1 END),
        'total_order_value', COALESCE(SUM(v.order_value), 0),
        'high_potential_visits', COUNT(CASE WHEN v.potential = 'High' THEN 1 END),
        'avg_order_value', COALESCE(ROUND(AVG(v.order_value), 2), 0)
    ) INTO result
    FROM salesmen s
    LEFT JOIN visits v ON s.id = v.salesman_id 
        AND DATE(v.created_at) = p_date
        AND v.deleted_at IS NULL
    WHERE s.id = p_salesman_id
        AND s.deleted_at IS NULL
    GROUP BY s.id, s.name;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. Update get_daily_admin_summary to include visit type breakdown
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
    -- Main summary with visit type breakdown (ONLY salesmen, not admins)
    SELECT jsonb_build_object(
        'tenant_id', p_tenant_id,
        'date', p_date,
        'active_salesmen', COUNT(DISTINCT v.salesman_id),
        'total_visits', COUNT(v.id),
        'personal_visits', COUNT(CASE WHEN v.visit_type = 'personal' THEN 1 END),
        'telephone_calls', COUNT(CASE WHEN v.visit_type = 'telephone' THEN 1 END),
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
    
    -- Top 3 performers with visit type breakdown (ONLY salesmen)
    SELECT jsonb_agg(performer ORDER BY total_visits DESC)
    INTO top_performers
    FROM (
        SELECT 
            jsonb_build_object(
                'name', s.name,
                'visits', COUNT(v.id),
                'personal_visits', COUNT(CASE WHEN v.visit_type = 'personal' THEN 1 END),
                'telephone_calls', COUNT(CASE WHEN v.visit_type = 'telephone' THEN 1 END),
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
            AND (s.is_admin = false OR s.is_admin IS NULL)  -- EXCLUDE ADMINS
        GROUP BY s.id, s.name
        HAVING COUNT(v.id) = 0
        ORDER BY s.name
    ) alert;
    
    -- Combine all
    summary := summary || jsonb_build_object(
        'top_performers', COALESCE(top_performers, '[]'::jsonb),
        'alerts', COALESCE(alerts, '[]'::jsonb)
    );
    
    RETURN summary::json;
END;
$$ LANGUAGE plpgsql;

-- Test the updated functions
SELECT get_daily_salesman_summary(
    (SELECT id FROM salesmen WHERE name ILIKE '%alok%' LIMIT 1),
    CURRENT_DATE
);

SELECT get_daily_admin_summary(
    (SELECT id FROM tenants WHERE company_name ILIKE '%hylite%' LIMIT 1),
    CURRENT_DATE
);
