-- EMERGENCY: Create salesman_targets table if it doesn't exist
-- Run this FIRST in your Supabase SQL Editor for ktvrffbccgxtaststlhw

-- Drop table if exists (to start fresh)
DROP TABLE IF EXISTS salesman_targets CASCADE;

-- Create the salesman_targets table with all required fields
CREATE TABLE salesman_targets (
    id BIGSERIAL PRIMARY KEY,
    salesman_id UUID NOT NULL REFERENCES salesmen(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
    visits_per_month INTEGER DEFAULT 0,
    visits_per_day DECIMAL(10,2) DEFAULT 0,
    new_visits_per_month INTEGER DEFAULT 0,
    repeat_visits_per_month INTEGER DEFAULT 0,
    orders_per_month INTEGER DEFAULT 0,
    order_value_per_month DECIMAL(15,2) DEFAULT 0.00,
    product_targets JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    tenant_id UUID REFERENCES tenants(id),
    UNIQUE(salesman_id, month, year)
);

-- Create indexes for performance
CREATE INDEX idx_targets_salesman ON salesman_targets(salesman_id);
CREATE INDEX idx_targets_period ON salesman_targets(year, month);
CREATE INDEX idx_targets_lookup ON salesman_targets(salesman_id, year, month);

-- Disable RLS completely
ALTER TABLE salesman_targets DISABLE ROW LEVEL SECURITY;

-- Grant full access
GRANT ALL ON salesman_targets TO authenticated;
GRANT ALL ON salesman_targets TO anon;
GRANT USAGE, SELECT ON SEQUENCE salesman_targets_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE salesman_targets_id_seq TO anon;

-- Verify table was created
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'salesman_targets') 
        THEN '✅ Table EXISTS'
        ELSE '❌ Table MISSING'
    END as status
FROM information_schema.tables
WHERE table_name = 'salesman_targets'
UNION ALL
SELECT 
    'RLS Status' as table_name,
    CASE WHEN rowsecurity THEN '⚠️ ENABLED' ELSE '✅ DISABLED' END as status
FROM pg_tables 
WHERE tablename = 'salesman_targets';

-- Show all columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'salesman_targets'
ORDER BY ordinal_position;
