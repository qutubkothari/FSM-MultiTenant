-- INSTRUCTIONS: Run this SQL in Supabase SQL Editor
-- This updates get_daily_salesman_summary to match the current WhatsApp report format
-- (personal visits vs telephone calls + revenue breakdown)

CREATE OR REPLACE FUNCTION get_daily_salesman_summary(
  p_salesman_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
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
  )
  INTO summary
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
$$;
