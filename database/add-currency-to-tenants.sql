-- Add currency support to tenants table
ALTER TABLE tenants
ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD',
ADD COLUMN currency_symbol VARCHAR(10) DEFAULT '$';

-- Update HYLITE to use Indian Rupee
UPDATE tenants
SET currency_code = 'INR',
    currency_symbol = '₹'
WHERE slug = 'hylite';

-- Update Gazelle to use Egyptian Pound
UPDATE tenants
SET currency_code = 'EGP',
    currency_symbol = 'E£'
WHERE slug = 'gazelle';

-- Add comments
COMMENT ON COLUMN tenants.currency_code IS 'ISO 4217 currency code (e.g., INR, EGP, USD)';
COMMENT ON COLUMN tenants.currency_symbol IS 'Currency symbol to display (e.g., ₹, E£, $)';
