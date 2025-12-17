-- Add optional customer email to visits
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS customer_email TEXT;
