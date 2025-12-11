# Add Soft Delete Support to Database

## IMPORTANT: Run this SQL script first before deploying the app

### Steps:

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Create a new query
5. Copy and paste the contents of `database/add-deleted-at-safe.sql`
6. Run the query
7. Verify the output shows the columns were added successfully

### What this does:

- Adds `deleted_at` column to: visits, customers, products, salesmen, plants, salesman_targets
- Creates indexes for better query performance
- Safe to run multiple times (uses `IF NOT EXISTS`)

### After running the SQL:

The app will automatically filter out deleted records from:
- Reports page (visits, salesmen, products, targets)
- Dashboard
- All other views

**Note**: If you see a 400 error on Reports page, it means the SQL hasn't been run yet. Run the SQL script above first.
