-- Add plant assignments to admins for multi-plant access control
-- Each admin can be assigned to specific plants (companies)

-- Add assigned_plants column to users table (not admins - that table doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'assigned_plants'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN assigned_plants TEXT[] DEFAULT ARRAY[]::TEXT[];
        
        COMMENT ON COLUMN users.assigned_plants IS 'Array of plant IDs (UUIDs) this admin has access to. Empty array means access to all plants (super admin).';
    END IF;
END $$;

-- Update existing admin users to have access to all plants (backward compatibility)
-- This ensures existing admins don't lose access after migration
UPDATE users 
SET assigned_plants = ARRAY[]::TEXT[]
WHERE (role = 'admin' OR role = 'super_admin') 
AND (assigned_plants IS NULL OR assigned_plants = '{}');

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_assigned_plants 
ON users USING GIN (assigned_plants);

-- Verification query
SELECT 
    id,
    name,
    phone,
    role,
    CASE 
        WHEN assigned_plants = ARRAY[]::TEXT[] OR assigned_plants IS NULL THEN 'All Plants (Super Admin)'
        WHEN array_length(assigned_plants, 1) IS NULL THEN 'No Plants Assigned'
        ELSE array_length(assigned_plants, 1)::text || ' Plant(s) Assigned'
    END as access_level,
    assigned_plants
FROM users
WHERE role IN ('admin', 'super_admin')
ORDER BY created_at DESC;
