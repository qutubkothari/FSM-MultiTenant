-- Add visit_type column to visits table
-- This allows tracking whether visit was personal (in-person) or telephone call

ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS visit_type VARCHAR(20) CHECK (visit_type IN ('personal', 'telephone'));

-- Set default for existing records
UPDATE visits 
SET visit_type = 'personal' 
WHERE visit_type IS NULL;

-- Make it required for new records
ALTER TABLE visits 
ALTER COLUMN visit_type SET DEFAULT 'personal';

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_visits_visit_type ON visits(visit_type);

-- Add column comment for documentation
COMMENT ON COLUMN visits.visit_type IS 'Type of visit: personal (in-person) or telephone (phone call)';
