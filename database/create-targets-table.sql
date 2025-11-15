-- Create salesman_targets table
CREATE TABLE IF NOT EXISTS salesman_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesman_id UUID NOT NULL REFERENCES salesmen(id) ON DELETE CASCADE,
  
  -- Time period
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  
  -- Visit targets
  visits_per_month INTEGER DEFAULT 0,
  visits_per_day DECIMAL(5,2) DEFAULT 0,
  new_visits_per_month INTEGER DEFAULT 0,
  repeat_visits_per_month INTEGER DEFAULT 0,
  
  -- Order targets
  orders_per_month INTEGER DEFAULT 0,
  order_value_per_month DECIMAL(12,2) DEFAULT 0,
  
  -- Product-wise targets (JSON array of {product_id, target_quantity})
  product_targets JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES salesmen(id),
  
  -- Ensure one target per salesman per month/year
  UNIQUE(salesman_id, month, year)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_targets_salesman ON salesman_targets(salesman_id);
CREATE INDEX IF NOT EXISTS idx_targets_period ON salesman_targets(year, month);

-- Add RLS policies
ALTER TABLE salesman_targets ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage all targets"
  ON salesman_targets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM salesmen
      WHERE salesmen.id = auth.uid()
      AND salesmen.is_admin = true
    )
  );

-- Salesmen can view their own targets
CREATE POLICY "Salesmen can view own targets"
  ON salesman_targets
  FOR SELECT
  USING (salesman_id = auth.uid());

-- Add comment
COMMENT ON TABLE salesman_targets IS 'Monthly targets for each salesman including visits, orders, and product-wise goals';
