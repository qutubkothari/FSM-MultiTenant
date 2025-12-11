-- Assign plants to test admin user 1234567890
-- This user should only see data from their assigned plant(s)

-- First, let's see what plants exist
SELECT id, name, name_ar FROM plants WHERE tenant_id = '112f12b8-55e9-4de8-9fda-d58e37c75796';

-- Check current assigned_plants for the user
SELECT phone, name, role, assigned_plants FROM users WHERE phone = '1234567890';

-- Assign ONE plant to this admin (replace 'PLANT_ID_HERE' with actual plant ID from above query)
-- Example: UPDATE users SET assigned_plants = ARRAY['5d3b1922-ea5d-48f0-a15a-896cc1a97670'] WHERE phone = '1234567890';

-- To assign multiple plants:
-- UPDATE users SET assigned_plants = ARRAY['plant-id-1', 'plant-id-2'] WHERE phone = '1234567890';

-- To make them a super admin (see all plants):
-- UPDATE users SET assigned_plants = ARRAY[]::TEXT[] WHERE phone = '1234567890';

-- Verify the update
SELECT phone, name, role, assigned_plants FROM users WHERE phone = '1234567890';
