-- Update visit_type check constraint to support personal and telephone visits
-- This allows the new visit type requirement from Egyptian client

-- Drop the old constraint
ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_type_check;

-- Add new constraint with both old and new values for backward compatibility
ALTER TABLE visits ADD CONSTRAINT visits_type_check 
    CHECK (visit_type IN ('new', 'followup', 'delivery', 'follow-up', 'personal', 'telephone'));

-- Update column comment
COMMENT ON COLUMN visits.visit_type IS 'Type of visit: new, followup, delivery, personal (in-person), or telephone (phone call)';
