-- Fix Hylite Currency Symbol
-- Run this in Supabase SQL Editor

UPDATE tenants 
SET 
    currency_code = 'INR',
    currency_symbol = '₹',
    updated_at = NOW()
WHERE id = '112f12b8-55e9-4de8-9fda-d58e37c75796';

-- Verify the update
SELECT 
    id,
    name,
    company_name,
    currency_code,
    currency_symbol,
    LENGTH(currency_symbol) as symbol_length,
    updated_at
FROM tenants 
WHERE id = '112f12b8-55e9-4de8-9fda-d58e37c75796';
