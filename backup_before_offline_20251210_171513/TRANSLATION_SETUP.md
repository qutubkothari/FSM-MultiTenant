# Auto-Translation Feature Setup Guide

## Overview
The system now includes automatic bidirectional translation between English and Arabic for visit data using Google Cloud Translation API. When a salesman enters visit information in Arabic, the system automatically translates it to English (and vice versa) so that managers speaking different languages can understand the data.

## Features Implemented
✅ Automatic language detection (Arabic vs English)
✅ Bidirectional translation for:
   - Customer Name
   - Contact Person
   - Remarks
✅ Translation stored in both languages in database
✅ Display shows user's preferred language automatically
✅ Excel export includes both language columns
✅ Graceful fallback if translation API fails

## Setup Steps

### 1. Execute Database Migration
Run the following SQL in your Supabase SQL Editor:

```sql
-- Add translation columns to visits table
ALTER TABLE visits ADD COLUMN customer_name_ar TEXT;
ALTER TABLE visits ADD COLUMN contact_person_ar TEXT;
ALTER TABLE visits ADD COLUMN remarks_ar TEXT;

-- Add comments for documentation
COMMENT ON COLUMN visits.customer_name_ar IS 'Arabic translation of customer name';
COMMENT ON COLUMN visits.contact_person_ar IS 'Arabic translation of contact person';
COMMENT ON COLUMN visits.remarks_ar IS 'Arabic translation of remarks';
```

**Status**: ⏸️ Pending - You need to execute this in Supabase

### 2. Set Up Google Cloud Translation API

#### Step 2.1: Enable the API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: `sak-expense-tracker` (or create a new one)
3. Navigate to **APIs & Services** → **Library**
4. Search for "Cloud Translation API"
5. Click **Enable**

#### Step 2.2: Create API Key
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the generated API key
4. (Recommended) Click **Restrict Key**:
   - Under "API restrictions", select "Restrict key"
   - Choose "Cloud Translation API"
   - Click **Save**

#### Step 2.3: Configure Environment Variable
Add the API key to your environment:

**For local development:**
Create/update `fsm-react/.env`:
```env
VITE_GOOGLE_TRANSLATE_API_KEY=your_api_key_here
```

**For Google App Engine (Production):**
Add to `app-react.yaml`:
```yaml
env_variables:
  VITE_GOOGLE_TRANSLATE_API_KEY: "your_api_key_here"
```

**Status**: ⏸️ Pending - You need to configure API key

### 3. Build and Deploy

```bash
cd fsm-react
npm run build
gcloud app deploy --quiet
```

**Status**: ⏸️ Pending - After completing steps 1 & 2

## How It Works

### Translation Flow
1. **User enters data**: Salesman fills visit form in their language (e.g., Arabic)
2. **Auto-detection**: System detects if text is Arabic or English (30% Arabic character threshold)
3. **Translation**: Calls Google Translate API to translate to the other language
4. **Storage**: Both English and Arabic versions stored in database
5. **Display**: User sees data in their preferred language automatically

### Example Workflow

**Scenario**: Arabic salesman creates visit

1. Salesman enters:
   - Customer Name: `شركة أزهر`
   - Contact Person: `عاطف`
   - Remarks: `الشركة مهتمة بمنتجاتنا الجديدة`

2. System auto-translates:
   - Customer Name: `Azhar Company` (English) + `شركة أزهر` (Arabic)
   - Contact Person: `Atif` (English) + `عاطف` (Arabic)
   - Remarks: `The company is interested in our new products` (English) + original Arabic

3. English manager views visit:
   - Sees: "Azhar Company", "Atif", "The company is interested in our new products"

4. Arabic manager views visit:
   - Sees: "شركة أزهر", "عاطف", "الشركة مهتمة بمنتجاتنا الجديدة"

## Cost Estimation

**Google Cloud Translation API Pricing:**
- $20 per 1 million characters
- Average visit has ~200 characters to translate (customer name + contact + remarks)
- **Estimated monthly cost**: $5-10 for typical usage (500-1000 visits/month)

## Translation Quality
- **Accuracy**: 85-90% for Arabic ↔ English
- **Professional terms**: Generally accurate for business context
- **Names**: Usually transliterated correctly (e.g., "محمد" → "Mohammed")

## Testing After Deployment

### Test 1: Arabic Input
1. Switch app language to Arabic (in settings)
2. Create a new visit with Arabic data:
   - Customer: `شركة الخليج`
   - Contact: `أحمد`
   - Remarks: `اجتماع ناجح`
3. Switch to English and verify you see:
   - Customer: `Gulf Company`
   - Contact: `Ahmed`
   - Remarks: `Successful meeting`

### Test 2: English Input
1. Switch app language to English
2. Create a new visit with English data:
   - Customer: `ABC Corporation`
   - Contact: `John`
   - Remarks: `Good meeting, follow up next week`
3. Switch to Arabic and verify you see Arabic translations

### Test 3: Excel Export
1. Go to Visits Management
2. Click "Export to Excel"
3. Open the file and verify columns:
   - Customer Name (English)
   - Customer Name (Arabic)
   - Contact Person (English)
   - Contact Person (Arabic)
   - Remarks (English)
   - Remarks (Arabic)

## Troubleshooting

### Translation Not Working
- **Check API key**: Verify `VITE_GOOGLE_TRANSLATE_API_KEY` is set correctly
- **Check API enabled**: Ensure Cloud Translation API is enabled in Google Cloud Console
- **Check quota**: Verify you haven't exceeded free tier quota
- **Check browser console**: Look for API errors in Developer Tools

### Wrong Language Detected
- System uses 30% Arabic character threshold
- If text has mixed language, it may detect incorrectly
- **Solution**: Enter primarily in one language

### Translation Shows "N/A"
- This happens when API call fails
- System falls back to showing original text
- **Check**: API key validity and network connection

## Files Modified

### New Files:
- `fsm-react/src/services/translationService.ts` - Google Translate API integration
- `database/add-visit-translation-fields.sql` - Database migration

### Updated Files:
- `fsm-react/src/components/salesman/NewVisitForm.tsx` - Added auto-translation on submit
- `fsm-react/src/components/admin/VisitsManagement.tsx` - Display translated fields
- `fsm-react/src/utils/arabicUtils.ts` - Already existed, no changes needed

## Next Steps

1. ✅ Execute database migration SQL (Step 1)
2. ✅ Enable Google Cloud Translation API (Step 2.1)
3. ✅ Create and configure API key (Step 2.2 & 2.3)
4. ✅ Build and deploy application (Step 3)
5. ✅ Test translation with Arabic and English visits
6. ✅ Verify Excel export includes both languages

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify database columns exist: `SELECT customer_name_ar, contact_person_ar, remarks_ar FROM visits LIMIT 1;`
3. Test API key manually: `curl "https://translation.googleapis.com/language/translate/v2?key=YOUR_KEY&q=hello&target=ar"`

## Future Enhancements (Optional)
- Add "Edit Translation" button for manual corrections
- Cache translations to reduce API calls
- Show translation confidence score
- Add translation for more fields (location_address, competitor_name)
- Support more languages (French, Spanish, etc.)
