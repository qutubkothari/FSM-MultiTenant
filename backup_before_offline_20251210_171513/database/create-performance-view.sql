-- BEST SOLUTION: Create a materialized view for instant dashboard loading
-- This pre-calculates all performance metrics at the database level
-- Run this in Supabase SQL Editor

-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS performance_summary CASCADE;

-- Create materialized view with all performance metrics
CREATE MATERIALIZED VIEW performance_summary AS
SELECT 
    s.id as salesman_id,
    s.name as salesman_name,
    s.is_active,
    
    -- Current month stats
    DATE_TRUNC('month', CURRENT_DATE) as month,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    EXTRACT(MONTH FROM CURRENT_DATE) as month_number,
    
    -- Targets
    COALESCE(t.visits_per_month, 0) as target_visits,
    COALESCE(t.orders_per_month, 0) as target_orders,
    COALESCE(t.order_value_per_month, 0) as target_order_value,
    
    -- Actual counts
    COUNT(DISTINCT v.id) as actual_visits,
    COUNT(DISTINCT CASE 
        WHEN 'Order' = ANY(v.meeting_type) 
        THEN v.id 
    END) as actual_orders,
    
    -- Actual order value
    COALESCE(SUM(CASE 
        WHEN 'Order' = ANY(v.meeting_type) 
        THEN v.order_value 
        ELSE 0 
    END), 0) as actual_order_value,
    
    -- Achievement percentages
    CASE 
        WHEN COALESCE(t.visits_per_month, 0) > 0 
        THEN ROUND((COUNT(DISTINCT v.id)::NUMERIC / t.visits_per_month) * 100)
        ELSE 0 
    END as visits_achievement,
    
    CASE 
        WHEN COALESCE(t.orders_per_month, 0) > 0 
        THEN ROUND((COUNT(DISTINCT CASE WHEN 'Order' = ANY(v.meeting_type) THEN v.id END)::NUMERIC / t.orders_per_month) * 100)
        ELSE 0 
    END as orders_achievement,
    
    CASE 
        WHEN COALESCE(t.order_value_per_month, 0) > 0 
        THEN ROUND((COALESCE(SUM(CASE WHEN 'Order' = ANY(v.meeting_type) THEN v.order_value ELSE 0 END), 0)::NUMERIC / t.order_value_per_month) * 100)
        ELSE 0 
    END as order_value_achievement,
    
    -- Last update timestamp
    NOW() as last_updated

FROM salesmen s
LEFT JOIN salesman_targets t ON s.id = t.salesman_id 
    AND t.month = EXTRACT(MONTH FROM CURRENT_DATE)
    AND t.year = EXTRACT(YEAR FROM CURRENT_DATE)
LEFT JOIN visits v ON s.id = v.salesman_id 
    AND DATE_TRUNC('month', v.created_at) = DATE_TRUNC('month', CURRENT_DATE)
WHERE s.is_admin = false
GROUP BY s.id, s.name, s.is_active, t.visits_per_month, t.orders_per_month, t.order_value_per_month;

-- Create index for fast queries
CREATE INDEX IF NOT EXISTS idx_performance_summary_achievement 
ON performance_summary(visits_achievement DESC);

-- Grant access to anon users
GRANT SELECT ON performance_summary TO anon;
GRANT SELECT ON performance_summary TO authenticated;

-- Create a function to refresh the view
CREATE OR REPLACE FUNCTION refresh_performance_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW performance_summary;
END;
$$ LANGUAGE plpgsql;

-- Manually refresh it now
REFRESH MATERIALIZED VIEW performance_summary;

-- Optional: Set up auto-refresh every 5 minutes using pg_cron (if enabled in Supabase)
-- SELECT cron.schedule('refresh-performance', '*/5 * * * *', 'SELECT refresh_performance_summary()');

-- For manual refresh, create a stored procedure the frontend can call
CREATE OR REPLACE FUNCTION get_performance_data(p_month INT DEFAULT NULL, p_year INT DEFAULT NULL)
RETURNS TABLE(
    salesman_name TEXT,
    target_visits INT,
    actual_visits BIGINT,
    target_orders INT,
    actual_orders BIGINT,
    target_order_value NUMERIC,
    actual_order_value NUMERIC,
    visits_achievement NUMERIC,
    orders_achievement NUMERIC,
    order_value_achievement NUMERIC
) AS $$
BEGIN
    -- If no month/year specified, use current
    IF p_month IS NULL THEN
        p_month := EXTRACT(MONTH FROM CURRENT_DATE);
    END IF;
    IF p_year IS NULL THEN
        p_year := EXTRACT(YEAR FROM CURRENT_DATE);
    END IF;
    
    RETURN QUERY
    SELECT 
        ps.salesman_name::TEXT,
        ps.target_visits::INT,
        ps.actual_visits::BIGINT,
        ps.target_orders::INT,
        ps.actual_orders::BIGINT,
        ps.target_order_value::NUMERIC,
        ps.actual_order_value::NUMERIC,
        ps.visits_achievement::NUMERIC,
        ps.orders_achievement::NUMERIC,
        ps.order_value_achievement::NUMERIC
    FROM performance_summary ps
    WHERE ps.month_number = p_month 
    AND ps.year = p_year
    ORDER BY ps.visits_achievement DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_performance_data(INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_performance_data(INT, INT) TO authenticated;
