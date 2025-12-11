-- Migration to add missing columns to visits table for the React PWA app
-- This adds columns used by the simplified visit form

-- Add customer phone column
ALTER TABLE visits ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);

-- Add customer address column
ALTER TABLE visits ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Add visit type column
ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_type VARCHAR(50) DEFAULT 'new';

-- Add notes column (simplified from remarks)
ALTER TABLE visits ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add status column for visit tracking
ALTER TABLE visits ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Add salesman name for easier queries
ALTER TABLE visits ADD COLUMN IF NOT EXISTS salesman_name VARCHAR(255);

-- Add location address (human-readable location)
ALTER TABLE visits ADD COLUMN IF NOT EXISTS location_address TEXT;

-- Make some existing columns nullable for simpler visit creation
ALTER TABLE visits ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE visits ALTER COLUMN contact_person DROP NOT NULL;
ALTER TABLE visits ALTER COLUMN meeting_type DROP NOT NULL;
ALTER TABLE visits ALTER COLUMN products_discussed DROP NOT NULL;
ALTER TABLE visits ALTER COLUMN potential DROP NOT NULL;
ALTER TABLE visits ALTER COLUMN gps_latitude DROP NOT NULL;
ALTER TABLE visits ALTER COLUMN gps_longitude DROP NOT NULL;
ALTER TABLE visits ALTER COLUMN time_in DROP NOT NULL;

-- Rename GPS columns to match app expectations
ALTER TABLE visits RENAME COLUMN gps_latitude TO location_lat;
ALTER TABLE visits RENAME COLUMN gps_longitude TO location_lng;

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_visits_customer_phone ON visits(customer_phone);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visits_type ON visits(visit_type);

-- Update RLS policies to allow salesmen to query their own visits
DROP POLICY IF EXISTS salesmen_visits_policy ON visits;
CREATE POLICY salesmen_visits_policy ON visits
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add check constraint for visit_type
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_type_check;
ALTER TABLE visits ADD CONSTRAINT visits_type_check 
    CHECK (visit_type IN ('new', 'followup', 'delivery', 'follow-up'));

-- Add check constraint for status
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_status_check;
ALTER TABLE visits ADD CONSTRAINT visits_status_check 
    CHECK (status IN ('pending', 'completed', 'cancelled'));

COMMENT ON COLUMN visits.customer_phone IS 'Customer phone number for direct contact';
COMMENT ON COLUMN visits.customer_address IS 'Customer physical address';
COMMENT ON COLUMN visits.visit_type IS 'Type of visit: new, followup, or delivery';
COMMENT ON COLUMN visits.notes IS 'Visit notes and observations';
COMMENT ON COLUMN visits.status IS 'Visit status: pending, completed, or cancelled';
COMMENT ON COLUMN visits.salesman_name IS 'Name of the salesman for easier queries';
COMMENT ON COLUMN visits.location_address IS 'Human-readable location from GPS coordinates';
