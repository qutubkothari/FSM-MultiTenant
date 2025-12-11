-- Quick fix: Add salesman_targets table to production database
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ktvrffbccgxtaststlhw/sql

-- Create salesman_targets table
CREATE TABLE IF NOT EXISTS public.salesman_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  salesman_id uuid NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  visits_per_month integer NULL DEFAULT 0,
  visits_per_day numeric(5, 2) NULL DEFAULT 0,
  new_visits_per_month integer NULL DEFAULT 0,
  repeat_visits_per_month integer NULL DEFAULT 0,
  orders_per_month integer NULL DEFAULT 0,
  order_value_per_month numeric(12, 2) NULL DEFAULT 0,
  product_targets jsonb NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  created_by uuid NULL,
  CONSTRAINT salesman_targets_pkey PRIMARY KEY (id),
  CONSTRAINT salesman_targets_salesman_id_month_year_key UNIQUE (salesman_id, month, year),
  CONSTRAINT salesman_targets_created_by_fkey FOREIGN KEY (created_by) REFERENCES salesmen (id),
  CONSTRAINT salesman_targets_salesman_id_fkey FOREIGN KEY (salesman_id) REFERENCES salesmen (id) ON DELETE CASCADE,
  CONSTRAINT salesman_targets_month_check CHECK ((month >= 1) AND (month <= 12))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_targets_lookup ON public.salesman_targets USING btree (salesman_id, month, year);
CREATE INDEX IF NOT EXISTS idx_targets_salesman ON public.salesman_targets USING btree (salesman_id);
CREATE INDEX IF NOT EXISTS idx_targets_period ON public.salesman_targets USING btree (year, month);

-- Disable RLS for now (since we're not using tenant filtering)
ALTER TABLE salesman_targets DISABLE ROW LEVEL SECURITY;

-- Verify table was created
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'salesman_targets';
