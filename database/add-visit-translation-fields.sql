-- Add translation fields for visits to support bilingual data
-- Run this in Supabase SQL Editor

-- Add Arabic translation columns to visits table
ALTER TABLE visits ADD COLUMN IF NOT EXISTS customer_name_ar TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS contact_person_ar TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS remarks_ar TEXT;

-- Add comments to document the translation fields
COMMENT ON COLUMN visits.customer_name_ar IS 'Customer name in Arabic (auto-translated or manually entered)';
COMMENT ON COLUMN visits.contact_person_ar IS 'Contact person name in Arabic (auto-translated or manually entered)';
COMMENT ON COLUMN visits.remarks_ar IS 'Visit remarks in Arabic (auto-translated or manually entered)';

-- Note: The system will auto-detect language and store:
-- - If user enters Arabic: stores in _ar column, translates to English for main column
-- - If user enters English: stores in main column, translates to Arabic for _ar column
-- - This ensures both English and Arabic managers can read visit data
