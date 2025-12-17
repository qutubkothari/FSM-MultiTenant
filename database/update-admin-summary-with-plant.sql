-- Update get_daily_admin_summary to include plant/branch information

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
    COUNT(DISTINCT CASE WHEN v.salesman_id IS NOT NULL THEN v.salesman_id END) as active_salesmen,
    COUNT(v.id) as total_visits,
    COUNT(CASE WHEN v.visit_type = 'personal' THEN 1 END) as personal_visits,
    COUNT(CASE WHEN v.visit_type = 'telephone' THEN 1 END) as telephone_calls,
    COALESCE(SUM(v.order_value), 0) as total_order_value,
    COALESCE(AVG(v.order_value), 0) as avg_order_value,
    COUNT(DISTINCT v.customer_id) as unique_customers,
    COUNT(DISTINCT CASE WHEN v.is_new_customer THEN v.customer_id END) as new_customers,
    COUNT(DISTINCT CASE WHEN NOT v.is_new_customer THEN v.customer_id END) as repeat_customers,
    COUNT(CASE WHEN v.follow_up_required THEN 1 END) as high_potential_visits
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
      'revenue', performer.order_value
    ) ORDER BY performer.order_value DESC
  )
  INTO top_performers_data
  FROM (
    SELECT
      s.name as salesman_name,
      COALESCE(p.plant_name, 'Unassigned') as plant_name,
      COUNT(v.id) as total_visits,
      COUNT(CASE WHEN v.visit_type = 'personal' THEN 1 END) as personal_visits,
      COUNT(CASE WHEN v.visit_type = 'telephone' THEN 1 END) as telephone_calls,
      COALESCE(SUM(v.order_value), 0) as order_value
    FROM salesmen s
    LEFT JOIN visits v ON v.salesman_id = s.id 
      AND DATE(v.created_at) = p_date 
      AND v.deleted_at IS NULL
    LEFT JOIN plants p ON p.id::text = ANY(string_to_array(s.plant, ','))
    WHERE s.tenant_id = p_tenant_id
      AND s.is_active = true
      AND s.is_admin = false
    GROUP BY s.id, s.name, p.plant_name
    HAVING COUNT(v.id) > 0
    ORDER BY order_value DESC
    LIMIT 5
  ) performer;

  -- Get alerts (salesmen with no visits)
  SELECT json_agg(
    json_build_object(
      'salesman_id', alert.salesman_id,
      'message', alert.message
    )
  )
  INTO alerts_data
  FROM (
    SELECT
      s.id as salesman_id,
      s.name || ' - No visits today' as message
    FROM salesmen s
    WHERE s.tenant_id = p_tenant_id
      AND s.is_active = true
      AND s.is_admin = false
      AND NOT EXISTS (
        SELECT 1 FROM visits v
        WHERE v.salesman_id = s.id
          AND DATE(v.created_at) = p_date
          AND v.deleted_at IS NULL
      )
  ) alert;

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
    'high_potential_visits', summary_data.high_potential_visits,
    'top_performers', COALESCE(top_performers_data, '[]'::json),
    'alerts', COALESCE(alerts_data, '[]'::json)
  );

  RETURN result;
END;
$$;
