-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'salesman')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read active users (for login)
CREATE POLICY "Allow read for active users" ON users
    FOR SELECT
    USING (is_active = true);

-- Policy: Allow insert for new registrations (public)
CREATE POLICY "Allow insert for registration" ON users
    FOR INSERT
    WITH CHECK (true);

-- Policy: Users can update their own record
CREATE POLICY "Users can update own record" ON users
    FOR UPDATE
    USING (phone = current_setting('app.current_user_phone', true));

-- Note: This is a basic authentication table. In production, you should:
-- 1. Hash passwords using bcrypt or similar
-- 2. Use Supabase Auth for proper authentication
-- 3. Implement proper session management
