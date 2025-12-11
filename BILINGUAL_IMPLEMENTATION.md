# Bilingual Field Implementation Guide

## Overview
This document outlines the implementation of bilingual (English + Arabic) fields across the FSM application and Arabic numeral support for passwords.

## Completed Changes

### 1. Arabic Numeral Support
✅ **Created utility functions** (`src/utils/arabicUtils.ts`):
- `normalizeArabicNumerals()` - Converts Arabic-Indic numerals (٠-٩) to ASCII (0-9)
- `containsArabic()` - Checks if text contains Arabic characters
- `validateBilingualInput()` - Validates that at least one language is filled
- `getBilingualDisplay()` - Returns appropriate display text based on language preference

✅ **Updated LoginPage** (`src/pages/LoginPage.tsx`):
- Phone number now accepts Arabic numerals
- Password now accepts Arabic numerals
- Registration form updated with normalization

✅ **Updated SuperAdminRegistration** (`src/pages/SuperAdminRegistration.tsx`):
- Mobile number normalized before validation
- Password normalized before storage
- All phone entries use normalized values

### 2. Database Schema
✅ **Created migration SQL** (`database/add-arabic-fields.sql`):
```sql
-- Products table
ALTER TABLE products ADD COLUMN name_ar TEXT;
ALTER TABLE products ADD COLUMN category_ar TEXT;
ALTER TABLE products ADD COLUMN description_ar TEXT;

-- Plants table
ALTER TABLE plants ADD COLUMN plant_name_ar TEXT;
ALTER TABLE plants ADD COLUMN area_ar TEXT;
ALTER TABLE plants ADD COLUMN city_ar TEXT;

-- Customers table
ALTER TABLE customers ADD COLUMN name_ar TEXT;
ALTER TABLE customers ADD COLUMN address_ar TEXT;

-- Salesmen table
ALTER TABLE salesmen ADD COLUMN name_ar TEXT;

-- Users table
ALTER TABLE users ADD COLUMN name_ar TEXT;
```

⚠️ **ACTION REQUIRED**: Run this SQL in Supabase SQL Editor

### 3. Bilingual Input Component
✅ **Created BilingualTextField** (`src/components/common/BilingualTextField.tsx`):
- Reusable component for English + Arabic input
- Side-by-side fields (responsive: stacks on mobile)
- Arabic field has RTL text direction
- Validates that at least one language is filled
- Supports multiline input

✅ **Added translations** to `src/i18n.ts`:
- "bilingualInput": "Bilingual Input" / "إدخال ثنائي اللغة"
- "english": "English" / "الإنجليزية"
- "arabic": "Arabic" / "العربية"
- "atLeastOneLanguageRequired": error message in both languages

## Next Steps - Forms to Update

### Priority 1: Master Data Forms

#### 1. **ProductsManagement.tsx**
Update formData state:
```typescript
const [formData, setFormData] = useState({
  code: '',
  name: '',
  name_ar: '',  // ADD
  category: '',
  category_ar: '',  // ADD
  description: '',
  description_ar: '',  // ADD
  unit_price: '',
  stock_quantity: '',
  is_active: true,
});
```

Replace TextField with BilingualTextField:
```typescript
import BilingualTextField from '../common/BilingualTextField';

// In the dialog:
<BilingualTextField
  labelEn="Product Name"
  labelAr="اسم المنتج"
  valueEn={formData.name}
  valueAr={formData.name_ar}
  onChangeEn={(val) => setFormData({ ...formData, name: val })}
  onChangeAr={(val) => setFormData({ ...formData, name_ar: val })}
  required
/>
```

#### 2. **PlantsManagement.tsx**
Update formData state:
```typescript
const [formData, setFormData] = useState({
  plant_code: '',
  plant_name: '',
  plant_name_ar: '',  // ADD
  area: '',
  area_ar: '',  // ADD
  city: '',
  city_ar: '',  // ADD
});
```

#### 3. **SalesmenManagement.tsx**
Update formData state:
```typescript
const [formData, setFormData] = useState({
  name: '',
  name_ar: '',  // ADD
  phone: '',
  email: '',
  password: '',
  is_admin: false,
  is_active: true,
  plant: [] as string[],
});
```

Add normalization for phone and password:
```typescript
import { normalizeArabicNumerals } from '../../utils/arabicUtils';

// In handleSubmit:
const normalizedPhone = normalizeArabicNumerals(formData.phone);
const normalizedPassword = normalizeArabicNumerals(formData.password);
```

#### 4. **CustomersManagement.tsx**
Update formData to include:
```typescript
name_ar: '',
address_ar: '',
```

### Priority 2: Visit Forms

#### 5. **NewVisitForm.tsx**
Update for:
- Customer name (bilingual display in autocomplete)
- Order value (accept Arabic numerals)

```typescript
// Add normalization:
const normalizedOrderValue = normalizeArabicNumerals(formData.order_value);
```

### Priority 3: Reports & Display

#### 6. Update Display Logic
Anywhere you display names, use bilingual display:
```typescript
import { getBilingualDisplay } from '../../utils/arabicUtils';

// Display based on user's language preference
const displayName = getBilingualDisplay(
  product.name,
  product.name_ar,
  i18n.language === 'ar'
);
```

## Testing Checklist

### Arabic Numeral Support
- [ ] Login with phone containing Arabic numerals (٥٥٥١٢٣٤٥٦٧)
- [ ] Login with password containing Arabic numerals
- [ ] Register new user with Arabic numerals in phone
- [ ] Register new user with Arabic numerals in password
- [ ] Register company with Arabic numerals in mobile number

### Bilingual Fields (After Form Updates)
- [ ] Add product with English name only
- [ ] Add product with Arabic name only
- [ ] Add product with both English and Arabic names
- [ ] Verify error when both fields are empty
- [ ] Edit existing product to add Arabic name
- [ ] Verify DataGrid displays correct names
- [ ] Export to Excel includes both English and Arabic columns
- [ ] Test same for Plants, Salesmen, Customers

### Display
- [ ] Switch language to Arabic, verify Arabic names show
- [ ] Switch to English, verify English names show (or Arabic if English empty)
- [ ] Test in visit forms, reports, and exports

## Migration Strategy

1. **Deploy Current Changes** (Arabic numeral support)
   ```bash
   npm run build
   gcloud app deploy --quiet
   ```

2. **Run Database Migration** in Supabase SQL Editor:
   - Execute `database/add-arabic-fields.sql`
   - Verify columns added: `SELECT column_name FROM information_schema.columns WHERE table_name='products'`

3. **Update Forms Gradually** (can be done incrementally):
   - Start with ProductsManagement
   - Then PlantsManagement
   - Then SalesmenManagement
   - Test each before moving to next

4. **Update Display Logic**:
   - Search for all places displaying names
   - Add bilingual display logic
   - Test language switching

5. **Update Exports**:
   - Add Arabic name columns to Excel exports
   - Update VisitsManagement export logic

## Benefits

✅ **User Experience**:
- Users can enter data in their preferred language
- System maintains both English and Arabic versions
- Switching languages shows appropriate names

✅ **Data Quality**:
- Arabic numerals no longer cause validation errors
- Phone numbers and passwords work with ١٢٣ format
- No need to switch keyboard layout for numbers

✅ **Flexibility**:
- Can enter only English, only Arabic, or both
- System validates at least one language is provided
- Existing data continues to work (English fields already populated)

✅ **International**:
- Supports true multilingual operations
- Future-proof for additional languages
- Follows best practices for i18n

## Notes

- Arabic fields use RTL (right-to-left) text direction automatically
- BilingualTextField component is reusable across all forms
- Normalization happens transparently - users don't see conversion
- Database migration is backward compatible (new columns are nullable)
- Can deploy in phases - Arabic numeral support works immediately
