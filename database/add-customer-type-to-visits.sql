-- Add customer_type to visits table (new/repeat)
ALTER TABLE visits
ADD COLUMN IF NOT EXISTS customer_type TEXT;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_visits_customer_type ON visits(customer_type);

-- Optional: Add check constraint
ALTER TABLE visits
ADD CONSTRAINT visits_customer_type_check 
CHECK (customer_type IS NULL OR customer_type IN ('new', 'repeat'));
