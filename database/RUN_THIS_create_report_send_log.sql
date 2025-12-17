-- INSTRUCTIONS: Run these statements ONE AT A TIME in Supabase SQL Editor
-- Purpose: Prevent duplicate daily sends (anti-spam)

-- Step 1: Create table
CREATE TABLE IF NOT EXISTS public.report_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  report_date date NOT NULL,
  report_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NULL,
  CONSTRAINT report_send_log_type_chk CHECK (report_type IN ('daily')),
  CONSTRAINT report_send_log_unique UNIQUE (tenant_id, report_date, report_type)
);

-- Step 2: Enable RLS
ALTER TABLE public.report_send_log ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SELECT policy (run this separately)
DROP POLICY IF EXISTS report_send_log_select_all ON public.report_send_log;
CREATE POLICY report_send_log_select_all ON public.report_send_log FOR SELECT USING (true);

-- Step 4: Create INSERT policy (run this separately)
DROP POLICY IF EXISTS report_send_log_insert_all ON public.report_send_log;
CREATE POLICY report_send_log_insert_all ON public.report_send_log FOR INSERT WITH CHECK (true);
