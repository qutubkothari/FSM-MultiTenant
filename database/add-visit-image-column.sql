-- Add visit_image column to visits table
ALTER TABLE visits ADD COLUMN IF NOT EXISTS visit_image TEXT;

-- Add comment to the column
COMMENT ON COLUMN visits.visit_image IS 'Base64 encoded image of the visit location/office';
