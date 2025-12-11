import { useState } from 'react';
import { Box, Button, Typography, Alert, CircularProgress, Card, CardContent } from '@mui/material';
import { supabase } from '../../services/supabase';
import { autoTranslateBilingual } from '../../services/translationService';
import { useTenantStore } from '../../store/tenantStore';

export default function TranslateProducts() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const { tenant } = useTenantStore();

  const handleTranslate = async () => {
    if (!tenant?.id) {
      setResult('Error: No tenant selected');
      return;
    }

    setLoading(true);
    setResult('');
    
    try {
      // Get all products without Arabic translations
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenant.id)
        .or('name_ar.is.null,category_ar.is.null');

      if (error) throw error;

      if (!products || products.length === 0) {
        setResult('✅ All products already have Arabic translations!');
        setLoading(false);
        return;
      }

      let updated = 0;
      let failed = 0;

      // Update each product with translations
      for (const product of products) {
        try {
          const updates: any = {};

          // Translate name if missing
          if (!product.name_ar && product.name) {
            const nameTranslation = await autoTranslateBilingual(product.name);
            updates.name_ar = nameTranslation.arabic;
          }

          // Translate category if missing
          if (!product.category_ar && product.category) {
            const categoryTranslation = await autoTranslateBilingual(product.category);
            updates.category_ar = categoryTranslation.arabic;
          }

          // Translate description if missing
          if (!product.description_ar && product.description) {
            const descTranslation = await autoTranslateBilingual(product.description);
            updates.description_ar = descTranslation.arabic;
          }

          // Update if we have translations
          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('products')
              .update(updates)
              .eq('id', product.id);

            if (updateError) {
              console.error(`Failed to update product ${product.name}:`, updateError);
              failed++;
            } else {
              updated++;
            }
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (err) {
          console.error(`Error translating product ${product.name}:`, err);
          failed++;
        }
      }

      setResult(`✅ Translation complete!\n\nUpdated: ${updated} products\nFailed: ${failed} products`);
      
    } catch (err: any) {
      setResult(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            🌐 Batch Translate Products to Arabic
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This tool will automatically translate all products that don't have Arabic names, categories, or descriptions.
          </Typography>

          <Button
            variant="contained"
            onClick={handleTranslate}
            disabled={loading}
            size="large"
          >
            {loading ? <CircularProgress size={24} /> : 'Translate All Products'}
          </Button>

          {result && (
            <Alert 
              severity={result.includes('Error') || result.includes('❌') ? 'error' : 'success'}
              sx={{ mt: 2, whiteSpace: 'pre-line' }}
            >
              {result}
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
