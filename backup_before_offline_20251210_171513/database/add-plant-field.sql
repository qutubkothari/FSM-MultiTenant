-- Add plant field to salesmen and visits tables

-- Add plant column to salesmen table
ALTER TABLE salesmen 
ADD COLUMN IF NOT EXISTS plant TEXT;

-- Add plant column to visits table
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS plant TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_salesmen_plant ON salesmen(plant);
CREATE INDEX IF NOT EXISTS idx_visits_plant ON visits(plant);

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('salesmen', 'visits') 
AND column_name = 'plant';
