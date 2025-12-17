-- Add working_days to salesman_targets for configurable visits/day calculation
ALTER TABLE salesman_targets
ADD COLUMN IF NOT EXISTS working_days INTEGER;

UPDATE salesman_targets
SET working_days = 25
WHERE working_days IS NULL;

ALTER TABLE salesman_targets
ALTER COLUMN working_days SET DEFAULT 25;

ALTER TABLE salesman_targets
ALTER COLUMN working_days SET NOT NULL;
