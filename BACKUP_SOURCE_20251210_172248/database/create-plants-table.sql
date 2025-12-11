-- Create plants table for plant selection
CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plant_code TEXT NOT NULL,
  plant_name TEXT NOT NULL,
  area TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(tenant_id, plant_code)
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_plants_tenant ON plants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plants_plant_code ON plants(plant_code);

-- Disable RLS to avoid access issues
ALTER TABLE plants DISABLE ROW LEVEL SECURITY;

-- Insert sample plants (optional - remove if not needed)
-- INSERT INTO plants (tenant_id, plant_code, plant_name, area, city) VALUES
-- ('your-tenant-id-here', 'P001', 'Plant 1', 'North Area', 'Mumbai'),
-- ('your-tenant-id-here', 'P002', 'Plant 2', 'South Area', 'Pune');
