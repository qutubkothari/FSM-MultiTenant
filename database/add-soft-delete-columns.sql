-- Add soft delete support to all tables
-- Standard ERP practice: flag records as deleted instead of removing them

-- Add deleted_at column to visits table
ALTER TABLE visits
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to customers table
ALTER TABLE customers
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to products table
ALTER TABLE products
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to salesmen table
ALTER TABLE salesmen
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to plants table (if exists)
ALTER TABLE plants
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to salesman_targets table
ALTER TABLE salesman_targets
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create indexes for better query performance
CREATE INDEX idx_visits_deleted_at ON visits(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_deleted_at ON products(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_salesmen_deleted_at ON salesmen(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_plants_deleted_at ON plants(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_salesman_targets_deleted_at ON salesman_targets(deleted_at) WHERE deleted_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN visits.deleted_at IS 'Soft delete timestamp - record is hidden when not NULL';
COMMENT ON COLUMN customers.deleted_at IS 'Soft delete timestamp - record is hidden when not NULL';
COMMENT ON COLUMN products.deleted_at IS 'Soft delete timestamp - record is hidden when not NULL';
COMMENT ON COLUMN salesmen.deleted_at IS 'Soft delete timestamp - record is hidden when not NULL';
COMMENT ON COLUMN plants.deleted_at IS 'Soft delete timestamp - record is hidden when not NULL';
COMMENT ON COLUMN salesman_targets.deleted_at IS 'Soft delete timestamp - record is hidden when not NULL';
