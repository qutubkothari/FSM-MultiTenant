-- INSTRUCTIONS: Run this SQL in Supabase SQL Editor
-- This updates get_daily_admin_summary to include plant/branch names for top performers

CREATE OR REPLACE FUNCTION get_daily_admin_summary(
  p_tenant_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  summary_data RECORD;
  top_performers_data JSON;
  alerts_data JSON;
BEGIN
  -- Get main summary
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

  -- Get top performers with plant information
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

  -- Build final JSON
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
$$;
