-- Add Arabic name fields to support bilingual data entry
-- Run this in Supabase SQL Editor

-- Add Arabic name columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_ar TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Add Arabic name columns to plants table
ALTER TABLE plants ADD COLUMN IF NOT EXISTS plant_name_ar TEXT;
ALTER TABLE plants ADD COLUMN IF NOT EXISTS area_ar TEXT;
ALTER TABLE plants ADD COLUMN IF NOT EXISTS city_ar TEXT;

-- Add Arabic name columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_ar TEXT;

-- Add Arabic name columns to salesmen table
ALTER TABLE salesmen ADD COLUMN IF NOT EXISTS name_ar TEXT;

-- Add Arabic name columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_ar TEXT;

-- Add comments to document the bilingual fields
COMMENT ON COLUMN products.name_ar IS 'Product name in Arabic';
COMMENT ON COLUMN products.category_ar IS 'Product category in Arabic';
COMMENT ON COLUMN products.description_ar IS 'Product description in Arabic';

COMMENT ON COLUMN plants.plant_name_ar IS 'Plant name in Arabic';
COMMENT ON COLUMN plants.area_ar IS 'Area name in Arabic';
COMMENT ON COLUMN plants.city_ar IS 'City name in Arabic';

COMMENT ON COLUMN customers.name_ar IS 'Customer name in Arabic';
COMMENT ON COLUMN customers.address_ar IS 'Customer address in Arabic';

COMMENT ON COLUMN salesmen.name_ar IS 'Salesman name in Arabic';
COMMENT ON COLUMN users.name_ar IS 'User name in Arabic';
