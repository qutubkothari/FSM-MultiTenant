-- Add unit_price and stock_quantity columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

-- Update RLS policies for products to allow all operations for admins
DROP POLICY IF EXISTS "Everyone can view active products" ON products;

-- Create new policies that allow full access
CREATE POLICY "Everyone can view products" ON products
    FOR SELECT USING (true);

CREATE POLICY "Everyone can insert products" ON products
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Everyone can update products" ON products
    FOR UPDATE USING (true);

CREATE POLICY "Everyone can delete products" ON products
    FOR DELETE USING (true);

-- Verify the changes
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' 
ORDER BY ordinal_position;
