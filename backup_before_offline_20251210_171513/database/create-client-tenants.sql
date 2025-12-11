-- Create tenants for Hylite and Gazelle
-- Run this in Supabase SQL Editor after deployment

-- Hylite tenant
INSERT INTO tenants (name, slug, company_name, primary_color, secondary_color, is_active)
VALUES 
  ('Hylite', 'hylite', 'Hylite', '#FF6B35', '#004E89', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  company_name = EXCLUDED.company_name,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  is_active = EXCLUDED.is_active;

-- Gazelle tenant
INSERT INTO tenants (name, slug, company_name, primary_color, secondary_color, is_active)
VALUES 
  ('Gazelle', 'gazelle', 'Gazelle', '#2ECC71', '#E74C3C', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  company_name = EXCLUDED.company_name,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  is_active = EXCLUDED.is_active;

-- Verify tenants created
SELECT id, name, slug, company_name, primary_color, secondary_color, is_active, created_at
FROM tenants
WHERE slug IN ('hylite', 'gazelle', 'sak')
ORDER BY created_at;

-- Show all tenants
SELECT 
  slug,
  company_name,
  'https://sak-fsm.el.r.appspot.com/' || slug as url,
  is_active
FROM tenants
ORDER BY created_at;
