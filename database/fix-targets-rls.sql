-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage all targets" ON salesman_targets;
DROP POLICY IF EXISTS "Salesmen can view own targets" ON salesman_targets;

-- Re-enable RLS
ALTER TABLE salesman_targets ENABLE ROW LEVEL SECURITY;

-- Admin can do everything (updated policy)
CREATE POLICY "Admins can manage all targets"
  ON salesman_targets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM salesmen
      WHERE salesmen.id = auth.uid()
      AND salesmen.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM salesmen
      WHERE salesmen.id = auth.uid()
      AND salesmen.is_admin = true
    )
  );

-- Salesmen can view their own targets
CREATE POLICY "Salesmen can view own targets"
  ON salesman_targets
  FOR SELECT
  TO authenticated
  USING (salesman_id = auth.uid());

-- Alternative: If you want to temporarily disable RLS for testing, uncomment:
-- ALTER TABLE salesman_targets DISABLE ROW LEVEL SECURITY;
