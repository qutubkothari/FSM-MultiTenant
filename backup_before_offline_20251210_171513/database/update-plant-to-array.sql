-- Change plant field from TEXT to TEXT[] to support multiple plants

-- For salesmen table
ALTER TABLE salesmen 
ALTER COLUMN plant TYPE TEXT[] USING CASE 
  WHEN plant IS NULL THEN NULL 
  WHEN plant = '' THEN NULL 
  ELSE ARRAY[plant] 
END;

-- For visits table
ALTER TABLE visits 
ALTER COLUMN plant TYPE TEXT[] USING CASE 
  WHEN plant IS NULL THEN NULL 
  WHEN plant = '' THEN NULL 
  ELSE ARRAY[plant] 
END;

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('salesmen', 'visits') 
AND column_name = 'plant';
