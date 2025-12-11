-- Add soft delete support to all tables (SAFE VERSION - won't fail if column exists)
-- Run this in Supabase SQL Editor

-- Add deleted_at column to visits table
ALTER TABLE visits
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to salesmen table
ALTER TABLE salesmen
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to plants table (if exists)
ALTER TABLE plants
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to salesman_targets table
ALTER TABLE salesman_targets
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create indexes for better query performance (DROP IF EXISTS to avoid errors)
DROP INDEX IF EXISTS idx_visits_deleted_at;
CREATE INDEX idx_visits_deleted_at ON visits(deleted_at) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_customers_deleted_at;
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_products_deleted_at;
CREATE INDEX idx_products_deleted_at ON products(deleted_at) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_salesmen_deleted_at;
CREATE INDEX idx_salesmen_deleted_at ON salesmen(deleted_at) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_plants_deleted_at;
CREATE INDEX idx_plants_deleted_at ON plants(deleted_at) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS idx_salesman_targets_deleted_at;
CREATE INDEX idx_salesman_targets_deleted_at ON salesman_targets(deleted_at) WHERE deleted_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN visits.deleted_at IS 'Soft delete timestamp - record is hidden when not NULL';
COMMENT ON COLUMN customers.deleted_at IS 'Soft delete timestamp - record is hidden when not NULL';
COMMENT ON COLUMN products.deleted_at IS 'Soft delete timestamp - record is hidden when not NULL';
COMMENT ON COLUMN salesmen.deleted_at IS 'Soft delete timestamp - record is hidden when not NULL';
COMMENT ON COLUMN plants.deleted_at IS 'Soft delete timestamp - record is hidden when not NULL';
COMMENT ON COLUMN salesman_targets.deleted_at IS 'Soft delete timestamp - record is hidden when not NULL';

-- Verify columns were added
SELECT 
    'visits' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'visits' AND column_name = 'deleted_at'
UNION ALL
SELECT 
    'customers' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'customers' AND column_name = 'deleted_at'
UNION ALL
SELECT 
    'products' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'deleted_at'
UNION ALL
SELECT 
    'salesmen' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'salesmen' AND column_name = 'deleted_at';
