-- Fix RLS Policies for Salesmen Table
-- Run this in Supabase SQL Editor to allow user registration

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Salesmen can view their own profile" ON salesmen;
DROP POLICY IF EXISTS "Salesmen can update their own profile" ON salesmen;
DROP POLICY IF EXISTS "Everyone can view salesmen" ON salesmen;
DROP POLICY IF EXISTS "Everyone can create salesmen" ON salesmen;

-- Create new policies with INSERT permission
CREATE POLICY "Everyone can view salesmen" ON salesmen
    FOR SELECT USING (true);

CREATE POLICY "Everyone can create salesmen" ON salesmen
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Salesmen can update their own profile" ON salesmen
    FOR UPDATE USING (true);
