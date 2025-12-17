-- Summary Generation Queries
-- Efficient queries to generate daily/weekly/monthly summaries for salesmen and admins

-- ==============================================
-- DAILY SALESMAN SUMMARY
-- ==============================================
-- Run this query for each salesman at end of day (6 PM)
CREATE OR REPLACE FUNCTION get_daily_salesman_summary(
    p_salesman_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON AS $$
DECLARE
    summary JSON;
BEGIN
    SELECT json_build_object(
        'salesman_id', s.id,
        'name', s.name,
        'phone', s.phone,
        'date', p_date,
        'personal_visits', COUNT(CASE WHEN v.visit_type = 'personal' THEN 1 END),
        'telephone_calls', COUNT(CASE WHEN v.visit_type = 'telephone' THEN 1 END),
        'total_order_value', COALESCE(SUM(v.order_value), 0),
        'personal_revenue', COALESCE(SUM(CASE WHEN v.visit_type = 'personal' THEN v.order_value ELSE 0 END), 0),
        'telephone_revenue', COALESCE(SUM(CASE WHEN v.visit_type = 'telephone' THEN v.order_value ELSE 0 END), 0),
        'unique_customers', COUNT(DISTINCT v.customer_id),
        'new_customers', COUNT(DISTINCT CASE WHEN v.customer_type = 'new' THEN v.customer_id END),
        'repeat_customers', COUNT(DISTINCT CASE WHEN v.customer_type = 'repeat' THEN v.customer_id END),
        'avg_order_value', COALESCE(ROUND(AVG(v.order_value), 2), 0)
    ) INTO summary
    FROM salesmen s
    LEFT JOIN visits v ON s.id = v.salesman_id
        AND DATE(v.created_at) = p_date
        AND v.deleted_at IS NULL
    WHERE s.id = p_salesman_id
        AND s.deleted_at IS NULL
        AND s.is_admin = false
    GROUP BY s.id, s.name, s.phone;
    
    RETURN summary;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- DAILY ADMIN SUMMARY (All Salesmen)
-- ==============================================
CREATE OR REPLACE FUNCTION get_daily_admin_summary(
    p_tenant_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON AS $$
DECLARE
        result JSON;
        summary_data RECORD;
        top_performers_data JSON;
BEGIN
        -- Get main summary (exclude admin visits)
        SELECT
                p_date as date,
                p_tenant_id as tenant_id,
                (SELECT COUNT(*)
                 FROM salesmen s
                 WHERE s.tenant_id = p_tenant_id
                   AND s.is_active = true
                   AND s.is_admin = false
                   AND s.deleted_at IS NULL) as active_salesmen,
                COUNT(v.id) as total_visits,
                COUNT(CASE WHEN v.visit_type = 'personal' THEN 1 END) as personal_visits,
                COUNT(CASE WHEN v.visit_type = 'telephone' THEN 1 END) as telephone_calls,
                COALESCE(SUM(v.order_value), 0) as total_order_value,
                COALESCE(AVG(v.order_value), 0) as avg_order_value,
                COUNT(DISTINCT v.customer_id) as unique_customers,
                COUNT(DISTINCT CASE WHEN v.customer_type = 'new' THEN v.customer_id END) as new_customers,
                COUNT(DISTINCT CASE WHEN v.customer_type = 'repeat' THEN v.customer_id END) as repeat_customers
        INTO summary_data
        FROM visits v
        WHERE v.tenant_id = p_tenant_id
                AND DATE(v.created_at) = p_date
                AND v.deleted_at IS NULL
                AND EXISTS (
                    SELECT 1 FROM salesmen s
                    WHERE s.id = v.salesman_id
                        AND s.is_admin = false
                );

        -- Performers with plant information (no artificial top-N cap)
        SELECT json_agg(
            json_build_object(
                'name', performer.salesman_name,
                'plant', performer.plant_name,
                'visits', performer.total_visits,
                'personal_visits', performer.personal_visits,
                'telephone_calls', performer.telephone_calls,
                'revenue', performer.order_value,
                'personal_revenue', performer.personal_revenue,
                'telephone_revenue', performer.telephone_revenue
            ) ORDER BY performer.order_value DESC
        )
        INTO top_performers_data
        FROM (
            SELECT
                s.name as salesman_name,
                CASE
                    WHEN s.plant IS NULL OR array_length(s.plant, 1) IS NULL THEN 'HQ'
                    WHEN array_length(s.plant, 1) > 0 THEN
                        COALESCE(
                            (SELECT plant_name FROM plants WHERE id::text = s.plant[1] LIMIT 1),
                            'Branch'
                        )
                    ELSE 'HQ'
                END as plant_name,
                COUNT(v.id) as total_visits,
                COUNT(CASE WHEN v.visit_type = 'personal' THEN 1 END) as personal_visits,
                COUNT(CASE WHEN v.visit_type = 'telephone' THEN 1 END) as telephone_calls,
                COALESCE(SUM(v.order_value), 0) as order_value,
                COALESCE(SUM(CASE WHEN v.visit_type = 'personal' THEN v.order_value ELSE 0 END), 0) as personal_revenue,
                COALESCE(SUM(CASE WHEN v.visit_type = 'telephone' THEN v.order_value ELSE 0 END), 0) as telephone_revenue
            FROM salesmen s
            LEFT JOIN visits v ON v.salesman_id = s.id
                AND DATE(v.created_at) = p_date
                AND v.deleted_at IS NULL
            WHERE s.tenant_id = p_tenant_id
                AND s.is_active = true
                AND s.is_admin = false
            GROUP BY s.id, s.name, s.plant
            ORDER BY order_value DESC
        ) performer;

        result := json_build_object(
            'date', summary_data.date,
            'tenant_id', summary_data.tenant_id,
            'active_salesmen', summary_data.active_salesmen,
            'total_visits', summary_data.total_visits,
            'personal_visits', summary_data.personal_visits,
            'telephone_calls', summary_data.telephone_calls,
            'total_order_value', summary_data.total_order_value,
            'avg_order_value', summary_data.avg_order_value,
            'unique_customers', summary_data.unique_customers,
            'new_customers', summary_data.new_customers,
            'repeat_customers', summary_data.repeat_customers,
            'top_performers', COALESCE(top_performers_data, '[]'::json),
            'alerts', '[]'::json
        );

        RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- WEEKLY SALESMAN SUMMARY
-- ==============================================
CREATE OR REPLACE FUNCTION get_weekly_salesman_summary(
    p_salesman_id UUID,
    p_week_start DATE
) RETURNS JSON AS $$
DECLARE
    summary JSON;
    week_end DATE;
    target_info JSON;
BEGIN
    week_end := p_week_start + INTERVAL '6 days';
    
    -- Get target info for the month
    SELECT json_build_object(
        'target_visits', COALESCE(st.total_visits, 0),
        'target_daily', COALESCE(ROUND(st.total_visits::numeric / st.working_days, 1), 0)
    ) INTO target_info
    FROM salesman_targets st
    WHERE st.salesman_id = p_salesman_id
        AND st.month = EXTRACT(MONTH FROM p_week_start)
        AND st.year = EXTRACT(YEAR FROM p_week_start)
        AND st.deleted_at IS NULL;
    
    SELECT json_build_object(
        'salesman_id', s.id,
        'name', s.name,
        'phone', s.phone,
        'week_number', EXTRACT(WEEK FROM p_week_start),
        'date_range', TO_CHAR(p_week_start, 'DD Mon') || ' - ' || TO_CHAR(week_end, 'DD Mon'),
        'total_visits', COUNT(v.id),
        'unique_customers', COUNT(DISTINCT v.customer_name),
        'new_customers', COUNT(CASE WHEN v.customer_type = 'new' THEN 1 END),
        'repeat_customers', COUNT(CASE WHEN v.customer_type = 'repeat' THEN 1 END),
        'total_order_value', COALESCE(SUM(v.order_value), 0),
        'avg_visits_per_day', COALESCE(ROUND(COUNT(v.id)::numeric / 7, 1), 0),
        'active_days', COUNT(DISTINCT DATE(v.created_at)),
        'target_visits', COALESCE((target_info->>'target_visits')::int, 0),
        'actual_visits', COUNT(v.id),
        'achievement_percentage', CASE 
            WHEN COALESCE((target_info->>'target_visits')::int, 0) > 0 
            THEN ROUND((COUNT(v.id)::numeric / (target_info->>'target_visits')::numeric) * 100, 1)
            ELSE 0 
        END
    ) INTO summary
    FROM salesmen s
    LEFT JOIN visits v ON s.id = v.salesman_id 
        AND DATE(v.created_at) BETWEEN p_week_start AND week_end
        AND v.deleted_at IS NULL
    WHERE s.id = p_salesman_id
    GROUP BY s.id, s.name, s.phone, target_info;
    
    RETURN summary;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- MONTHLY ADMIN SUMMARY
-- ==============================================
CREATE OR REPLACE FUNCTION get_monthly_admin_summary(
    p_tenant_id UUID,
    p_month INT,
    p_year INT
) RETURNS JSON AS $$
DECLARE
    summary JSON;
    dept_performance JSON;
    month_start DATE;
    month_end DATE;
BEGIN
    month_start := make_date(p_year, p_month, 1);
    month_end := (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    -- Main summary
    SELECT json_build_object(
        'tenant_id', p_tenant_id,
        'month_name', TO_CHAR(month_start, 'Month YYYY'),
        'month', p_month,
        'year', p_year,
        'total_salesmen', COUNT(DISTINCT v.salesman_id),
        'total_visits', COUNT(v.id),
        'unique_customers', COUNT(DISTINCT v.customer_name),
        'new_customers', COUNT(CASE WHEN v.customer_type = 'new' THEN 1 END),
        'repeat_customers', COUNT(CASE WHEN v.customer_type = 'repeat' THEN 1 END),
        'total_order_value', COALESCE(SUM(v.order_value), 0),
        'avg_revenue_per_visit', COALESCE(ROUND(AVG(v.order_value), 2), 0),
        'high_potential_visits', COUNT(CASE WHEN v.potential = 'High' THEN 1 END),
        'total_working_days', EXTRACT(DAY FROM month_end)
    ) INTO summary
    FROM visits v
    WHERE v.tenant_id = p_tenant_id
        AND DATE(v.created_at) BETWEEN month_start AND month_end
        AND v.deleted_at IS NULL;
    
    -- Top performers
    SELECT json_agg(performer ORDER BY revenue DESC)
    INTO dept_performance
    FROM (
        SELECT 
            s.name,
            COUNT(v.id) as visits,
            COALESCE(SUM(v.order_value), 0) as revenue
        FROM salesmen s
        LEFT JOIN visits v ON s.id = v.salesman_id 
            AND DATE(v.created_at) BETWEEN month_start AND month_end
            AND v.deleted_at IS NULL
        WHERE s.tenant_id = p_tenant_id
            AND s.deleted_at IS NULL
        GROUP BY s.id, s.name
        HAVING COUNT(v.id) > 0
        ORDER BY SUM(v.order_value) DESC
        LIMIT 5
    ) performer;
    
    summary := summary || json_build_object(
        'departments', COALESCE(dept_performance, '[]'::json)
    );
    
    RETURN summary;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- USAGE EXAMPLES
-- ==============================================

-- Get today's summary for a specific salesman
-- SELECT get_daily_salesman_summary('salesman-uuid-here', CURRENT_DATE);

-- Get today's admin summary for a tenant
-- SELECT get_daily_admin_summary('tenant-uuid-here', CURRENT_DATE);

-- Get this week's summary for a salesman (week starts Monday)
-- SELECT get_weekly_salesman_summary('salesman-uuid-here', date_trunc('week', CURRENT_DATE)::DATE);

-- Get this month's admin summary
-- SELECT get_monthly_admin_summary('tenant-uuid-here', EXTRACT(MONTH FROM CURRENT_DATE)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT);

COMMENT ON FUNCTION get_daily_salesman_summary IS 'Generates daily performance summary for individual salesman';
COMMENT ON FUNCTION get_daily_admin_summary IS 'Generates daily team summary for admin with top performers and alerts';
COMMENT ON FUNCTION get_weekly_salesman_summary IS 'Generates weekly performance summary for salesman with target tracking';
COMMENT ON FUNCTION get_monthly_admin_summary IS 'Generates monthly summary for admin with complete team performance';
