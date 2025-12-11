-- Add translation_enabled column to tenants table
-- This allows each tenant to control whether Arabic translation is enabled

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS translation_enabled BOOLEAN DEFAULT false;

-- Update comment
COMMENT ON COLUMN tenants.translation_enabled IS 'Enable/disable Arabic translation for this tenant';

-- Optionally, enable it for Gazelle (update the tenant_id as needed)
-- UPDATE tenants SET translation_enabled = true WHERE company_name = 'Gazelle';
