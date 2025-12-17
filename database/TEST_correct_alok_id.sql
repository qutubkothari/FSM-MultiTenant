-- Test with CORRECT salesman_id from salesmen table

-- This is Alok's REAL ID in salesmen table (from last query result)
SELECT get_daily_salesman_summary(
  'b4cc8d15-2099-43e2-b1f8-435e31b69658'::uuid,
  '2025-12-16'::date
);

-- Pretty print the JSON
SELECT jsonb_pretty(
  get_daily_salesman_summary(
    'b4cc8d15-2099-43e2-b1f8-435e31b69658'::uuid,
    '2025-12-16'::date
  )::jsonb
);
