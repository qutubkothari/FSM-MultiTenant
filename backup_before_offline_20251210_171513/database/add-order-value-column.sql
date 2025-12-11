-- Add order_value column to visits table
ALTER TABLE visits ADD COLUMN IF NOT EXISTS order_value DECIMAL(12,2) DEFAULT 0;

-- Add index for order value queries
CREATE INDEX IF NOT EXISTS idx_visits_order_value ON visits(order_value);

-- Add comment
COMMENT ON COLUMN visits.order_value IS 'Order value in rupees when meeting_type includes Order';
