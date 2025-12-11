-- Critical indexes for performance - MUST RUN THIS
-- This will make queries 10-100x faster

-- Visits table indexes
CREATE INDEX IF NOT EXISTS idx_visits_salesman_id ON visits(salesman_id);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_salesman_date ON visits(salesman_id, created_at);
CREATE INDEX IF NOT EXISTS idx_visits_meeting_type ON visits USING GIN(meeting_type);

-- Targets table indexes
CREATE INDEX IF NOT EXISTS idx_targets_salesman_id ON salesman_targets(salesman_id);
CREATE INDEX IF NOT EXISTS idx_targets_month_year ON salesman_targets(month, year);
CREATE INDEX IF NOT EXISTS idx_targets_lookup ON salesman_targets(salesman_id, month, year);

-- Salesmen table indexes
CREATE INDEX IF NOT EXISTS idx_salesmen_active ON salesmen(is_active);
CREATE INDEX IF NOT EXISTS idx_salesmen_admin ON salesmen(is_admin);

-- Customers table indexes
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- Analyze tables to update statistics
ANALYZE visits;
ANALYZE targets;
ANALYZE salesmen;
ANALYZE customers;
ANALYZE products;
