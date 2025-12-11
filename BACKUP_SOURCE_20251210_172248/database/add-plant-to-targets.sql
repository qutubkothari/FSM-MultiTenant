-- Add plant column to salesman_targets table for multi-plant filtering

-- Add plant column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'salesman_targets' 
        AND column_name = 'plant'
    ) THEN
        ALTER TABLE salesman_targets 
        ADD COLUMN plant TEXT[];
        
        COMMENT ON COLUMN salesman_targets.plant IS 'Array of plant IDs this target applies to';
    END IF;
END $$;

-- Update existing targets: get plant from salesman
UPDATE salesman_targets st
SET plant = ARRAY[s.plant]::TEXT[]
FROM salesmen s
WHERE st.salesman_id = s.id
AND st.plant IS NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_salesman_targets_plant 
ON salesman_targets USING GIN (plant);

-- Verify
SELECT 
    'salesman_targets' as table_name,
    COUNT(*) as total_records,
    COUNT(plant) as records_with_plant,
    COUNT(*) - COUNT(plant) as records_without_plant
FROM salesman_targets;
