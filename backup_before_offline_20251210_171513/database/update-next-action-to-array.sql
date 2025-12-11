-- Change next_action field from VARCHAR to TEXT[] to support multiple next actions

-- For visits table
ALTER TABLE visits 
ALTER COLUMN next_action TYPE TEXT[] USING CASE 
  WHEN next_action IS NULL THEN NULL 
  WHEN next_action = '' THEN NULL 
  ELSE ARRAY[next_action] 
END;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'visits' 
AND column_name = 'next_action';
