-- Fresh setup script - Run this after deleting all data
-- This ensures all tables and policies are properly configured

-- 1. Drop existing policies if any
DROP POLICY IF EXISTS "Allow read for active users" ON users;
DROP POLICY IF EXISTS "Allow insert for registration" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;

-- 2. Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'salesman')),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- 4. Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies - ALLOW ALL ACCESS for now
-- This allows registration and login to work
CREATE POLICY "Allow all access to users" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. Verify setup
SELECT 'users table' as table_name, COUNT(*) as record_count FROM users;

-- 7. Test insert (optional - comment out after first run)
-- INSERT INTO users (phone, name, password, role, email) 
-- VALUES ('1234567890', 'Test User', 'test123', 'salesman', 'test@example.com');
