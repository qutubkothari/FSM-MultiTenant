-- Add timezone and weekend configuration to tenants table

-- Add timezone column (IANA timezone names)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';

-- Add weekend days column (array of day numbers: 0=Sunday, 1=Monday, ..., 6=Saturday)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS weekend_days INTEGER[] DEFAULT ARRAY[0,6]; -- Saturday, Sunday

-- Add notification time column (time in their local timezone)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS notification_time TIME DEFAULT '18:00:00'; -- 6:00 PM local time

-- Update existing tenants with their specific timezones
UPDATE tenants SET 
  timezone = 'Africa/Cairo',
  weekend_days = ARRAY[5,6], -- Friday, Saturday
  notification_time = '18:00:00'
WHERE company_name ILIKE '%gazelle%';

UPDATE tenants SET 
  timezone = 'Asia/Kolkata',
  weekend_days = ARRAY[0,6], -- Saturday, Sunday
  notification_time = '18:00:00'
WHERE company_name ILIKE '%hylite%';

UPDATE tenants SET 
  timezone = 'Asia/Kolkata',
  weekend_days = ARRAY[0,6], -- Saturday, Sunday
  notification_time = '18:00:00'
WHERE company_name ILIKE '%crescent%';

-- Verify the settings
SELECT 
  company_name,
  timezone,
  notification_time,
  weekend_days,
  CASE 
    WHEN 5 = ANY(weekend_days) AND 6 = ANY(weekend_days) THEN 'Friday-Saturday'
    WHEN 0 = ANY(weekend_days) AND 6 = ANY(weekend_days) THEN 'Saturday-Sunday'
    ELSE 'Custom'
  END as weekend_pattern
FROM tenants
ORDER BY company_name;
