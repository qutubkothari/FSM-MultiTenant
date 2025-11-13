-- FSM Mobile App Database Schema
-- Supabase PostgreSQL Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Salesmen Table
CREATE TABLE IF NOT EXISTS salesmen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on phone for faster lookups
CREATE INDEX idx_salesmen_phone ON salesmen(phone);
CREATE INDEX idx_salesmen_active ON salesmen(is_active);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for customer searches
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for product lookups
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_active ON products(is_active);

-- Competitors Table
CREATE TABLE IF NOT EXISTS competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_competitors_name ON competitors(name);

-- Visits Table
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salesman_id UUID NOT NULL REFERENCES salesmen(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    meeting_type TEXT[] NOT NULL, -- Array of meeting types
    products_discussed UUID[] NOT NULL, -- Array of product IDs
    next_action VARCHAR(100),
    next_action_date TIMESTAMP WITH TIME ZONE,
    potential VARCHAR(20) NOT NULL CHECK (potential IN ('High', 'Medium', 'Low')),
    competitor_name VARCHAR(255),
    can_be_switched BOOLEAN,
    remarks TEXT,
    gps_latitude DECIMAL(10, 8) NOT NULL,
    gps_longitude DECIMAL(11, 8) NOT NULL,
    time_in TIMESTAMP WITH TIME ZONE NOT NULL,
    time_out TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced BOOLEAN DEFAULT true,
    offline_id VARCHAR(50)
);

-- Create indexes for visit queries
CREATE INDEX idx_visits_salesman ON visits(salesman_id);
CREATE INDEX idx_visits_customer ON visits(customer_id);
CREATE INDEX idx_visits_date ON visits(created_at);
CREATE INDEX idx_visits_next_action_date ON visits(next_action_date);
CREATE INDEX idx_visits_potential ON visits(potential);

-- Enable Row Level Security (RLS)
ALTER TABLE salesmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Salesmen
CREATE POLICY "Salesmen can view their own profile" ON salesmen
    FOR SELECT USING (true);

CREATE POLICY "Salesmen can update their own profile" ON salesmen
    FOR UPDATE USING (true);

-- RLS Policies for Customers
CREATE POLICY "Everyone can view customers" ON customers
    FOR SELECT USING (true);

CREATE POLICY "Everyone can create customers" ON customers
    FOR INSERT WITH CHECK (true);

-- RLS Policies for Products
CREATE POLICY "Everyone can view active products" ON products
    FOR SELECT USING (is_active = true);

-- RLS Policies for Competitors
CREATE POLICY "Everyone can view competitors" ON competitors
    FOR SELECT USING (true);

CREATE POLICY "Everyone can create competitors" ON competitors
    FOR INSERT WITH CHECK (true);

-- RLS Policies for Visits
CREATE POLICY "Salesmen can view their own visits" ON visits
    FOR SELECT USING (true);

CREATE POLICY "Salesmen can create visits" ON visits
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Salesmen can update their own visits" ON visits
    FOR UPDATE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_salesmen_updated_at BEFORE UPDATE ON salesmen
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample products (can be customized)
INSERT INTO products (name, code, category, is_active) VALUES
    ('Product A', 'PROD-A', 'Category 1', true),
    ('Product B', 'PROD-B', 'Category 1', true),
    ('Product C', 'PROD-C', 'Category 2', true),
    ('Product D', 'PROD-D', 'Category 2', true),
    ('Product E', 'PROD-E', 'Category 3', true)
ON CONFLICT (code) DO NOTHING;

-- Views for Analytics

-- Salesman Performance View
CREATE OR REPLACE VIEW salesman_performance AS
SELECT 
    s.id as salesman_id,
    s.name as salesman_name,
    COUNT(v.id) as total_visits,
    COUNT(CASE WHEN 'Introduction' = ANY(v.meeting_type) THEN 1 END) as introductions,
    COUNT(CASE WHEN 'Enquiry' = ANY(v.meeting_type) THEN 1 END) as enquiries,
    COUNT(CASE WHEN 'Order' = ANY(v.meeting_type) THEN 1 END) as orders,
    COUNT(CASE WHEN 'Payment' = ANY(v.meeting_type) THEN 1 END) as payments,
    COUNT(CASE WHEN 'Follow-up' = ANY(v.meeting_type) THEN 1 END) as follow_ups,
    CASE 
        WHEN COUNT(CASE WHEN 'Enquiry' = ANY(v.meeting_type) THEN 1 END) > 0 
        THEN (COUNT(CASE WHEN 'Order' = ANY(v.meeting_type) THEN 1 END)::FLOAT / 
              COUNT(CASE WHEN 'Enquiry' = ANY(v.meeting_type) THEN 1 END)::FLOAT) * 100
        ELSE 0 
    END as hit_ratio
FROM salesmen s
LEFT JOIN visits v ON s.id = v.salesman_id
WHERE s.is_active = true
GROUP BY s.id, s.name;

-- Product Discussion Frequency View
CREATE OR REPLACE VIEW product_discussion_stats AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.code as product_code,
    COUNT(v.id) as discussion_count,
    COUNT(CASE WHEN 'Order' = ANY(v.meeting_type) THEN 1 END) as order_count
FROM products p
LEFT JOIN visits v ON p.id = ANY(v.products_discussed)
WHERE p.is_active = true
GROUP BY p.id, p.name, p.code
ORDER BY discussion_count DESC;

-- Customer Visit History View
CREATE OR REPLACE VIEW customer_visit_history AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    c.contact_person,
    COUNT(v.id) as visit_count,
    MAX(v.created_at) as last_visit_date,
    MODE() WITHIN GROUP (ORDER BY v.potential) as most_common_potential
FROM customers c
LEFT JOIN visits v ON c.id = v.customer_id
GROUP BY c.id, c.name, c.contact_person
ORDER BY visit_count DESC;
