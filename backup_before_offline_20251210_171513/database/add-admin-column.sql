-- Add missing is_admin column to salesmen table
ALTER TABLE salesmen ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index on is_admin for faster admin queries
CREATE INDEX IF NOT EXISTS idx_salesmen_admin ON salesmen(is_admin);

-- Insert a default admin user if none exists
INSERT INTO salesmen (name, phone, email, is_admin, is_active)
VALUES ('Admin', '1234567890', 'admin@fsm.com', true, true)
ON CONFLICT (phone) DO UPDATE SET is_admin = true;
