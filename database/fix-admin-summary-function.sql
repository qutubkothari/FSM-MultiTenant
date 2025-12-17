-- Fix for get_daily_admin_summary function
-- Run this to fix the JSON concatenation error

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
    -- Main summary
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
    WHERE v.tenant_id = p_tenant_id
        AND DATE(v.created_at) = p_date
        AND v.deleted_at IS NULL;
    
    -- Top 3 performers
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
        GROUP BY s.id, s.name
        HAVING COUNT(v.id) > 0
        ORDER BY COUNT(v.id) DESC
        LIMIT 3
    ) perf;
    
    -- Alerts (salesmen with 0 visits today)
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
        GROUP BY s.id, s.name
        HAVING COUNT(v.id) = 0
        LIMIT 5
    ) alert;
    
    -- Combine all (using JSONB concatenation)
    summary := summary || jsonb_build_object(
        'top_performers', COALESCE(top_performers, '[]'::jsonb),
        'alerts', COALESCE(alerts, '[]'::jsonb)
    );
    
    RETURN summary::json;
END;
$$ LANGUAGE plpgsql;

-- Test the fixed function
SELECT get_daily_admin_summary(
    (SELECT id FROM tenants LIMIT 1),
    CURRENT_DATE
);
