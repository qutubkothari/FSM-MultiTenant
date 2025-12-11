-- FIX: Make tenant_id and created_by nullable in salesman_targets
-- This allows the demo version to work without tenant filtering

ALTER TABLE salesman_targets 
ALTER COLUMN tenant_id DROP NOT NULL;

ALTER TABLE salesman_targets 
ALTER COLUMN created_by DROP NOT NULL;

-- Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'salesman_targets'
    AND column_name IN ('tenant_id', 'created_by');

-- Test: This should now work without tenant_id
-- SELECT COUNT(*) FROM salesman_targets WHERE tenant_id IS NULL;
