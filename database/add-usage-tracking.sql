-- Create adoption tracking table
CREATE TABLE IF NOT EXISTS app_usage_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  salesman_id UUID REFERENCES salesmen(id),
  date DATE DEFAULT CURRENT_DATE,
  
  -- Daily activity
  app_opens INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  visits_logged INTEGER DEFAULT 0,
  visits_with_gps INTEGER DEFAULT 0,
  visits_with_photos INTEGER DEFAULT 0,
  
  -- Engagement
  last_login_at TIMESTAMP WITH TIME ZONE,
  days_since_last_use INTEGER DEFAULT 0,
  
  -- Red flags
  visits_outside_hours INTEGER DEFAULT 0, -- Before 8 AM or after 8 PM
  duplicate_locations INTEGER DEFAULT 0, -- Same GPS for different customers
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily usage summary function
CREATE OR REPLACE FUNCTION get_usage_summary(
  p_tenant_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'date', p_date,
    'active_users', COUNT(DISTINCT salesman_id),
    'total_visits', SUM(visits_logged),
    'gps_compliance', ROUND(AVG(CASE WHEN visits_logged > 0 THEN visits_with_gps::NUMERIC / visits_logged * 100 ELSE 0 END), 1),
    'photo_compliance', ROUND(AVG(CASE WHEN visits_logged > 0 THEN visits_with_photos::NUMERIC / visits_logged * 100 ELSE 0 END), 1),
    'inactive_users', (
      SELECT COUNT(*) 
      FROM salesmen s
      LEFT JOIN app_usage_metrics m ON s.id = m.salesman_id AND m.date = p_date
      WHERE s.tenant_id = p_tenant_id 
        AND s.is_active = true
        AND s.is_admin = false
        AND (m.visits_logged IS NULL OR m.visits_logged = 0)
    ),
    'red_flags', json_build_object(
      'visits_outside_hours', SUM(visits_outside_hours),
      'duplicate_locations', SUM(duplicate_locations)
    )
  ) INTO result
  FROM app_usage_metrics
  WHERE tenant_id = p_tenant_id
    AND date = p_date;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add compliance columns to visits table
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS has_gps_location BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_photo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gps_accuracy_meters NUMERIC,
ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER;
