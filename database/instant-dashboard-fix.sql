-- INSTANT DASHBOARD FIX
-- Run this ONCE in Supabase SQL Editor to enable sub-second dashboard loading
-- This creates indexes + optimized function for ultra-fast queries

-- Step 1: Create critical indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_visits_salesman_created 
ON visits(salesman_id, created_at);

CREATE INDEX IF NOT EXISTS idx_visits_meeting_type 
ON visits USING GIN(meeting_type);

CREATE INDEX IF NOT EXISTS idx_targets_salesman_month_year 
ON salesman_targets(salesman_id, month, year);

CREATE INDEX IF NOT EXISTS idx_salesmen_admin 
ON salesmen(is_admin) WHERE is_admin = false;

-- Step 2: Create ultra-fast performance data function
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
    -- Use current month/year if not specified
    IF p_month IS NULL THEN
        p_month := EXTRACT(MONTH FROM CURRENT_DATE);
    END IF;
    IF p_year IS NULL THEN
        p_year := EXTRACT(YEAR FROM CURRENT_DATE);
    END IF;
    
    RETURN QUERY
    SELECT 
        s.name::TEXT as salesman_name,
        COALESCE(t.visits_per_month, 0)::INT as target_visits,
        COUNT(DISTINCT v.id) as actual_visits,
        COALESCE(t.orders_per_month, 0)::INT as target_orders,
        COUNT(DISTINCT CASE WHEN 'Order' = ANY(v.meeting_type) THEN v.id END) as actual_orders,
        COALESCE(t.order_value_per_month, 0)::NUMERIC as target_order_value,
        COALESCE(SUM(CASE WHEN 'Order' = ANY(v.meeting_type) THEN v.order_value ELSE 0 END), 0)::NUMERIC as actual_order_value,
        
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
        END as order_value_achievement
        
    FROM salesmen s
    LEFT JOIN salesman_targets t ON s.id = t.salesman_id 
        AND t.month = p_month
        AND t.year = p_year
    LEFT JOIN visits v ON s.id = v.salesman_id 
        AND EXTRACT(MONTH FROM v.created_at) = p_month
        AND EXTRACT(YEAR FROM v.created_at) = p_year
    WHERE s.is_admin = false
    GROUP BY s.id, s.name, t.visits_per_month, t.orders_per_month, t.order_value_per_month
    ORDER BY visits_achievement DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION get_performance_data(INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_performance_data(INT, INT) TO authenticated;

-- Step 4: Test the function (should return results in <100ms)
SELECT * FROM get_performance_data(11, 2025) LIMIT 5;
