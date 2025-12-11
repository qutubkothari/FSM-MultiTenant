import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Grid,
  Divider,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Upload,
  Save,
  Business,
  Palette,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { useTenantStore } from '../../store/tenantStore';
import { useAuthStore } from '../../store/authStore';

export default function TenantSettings() {
  const { t, i18n } = useTranslation();
  const { tenant, setTenant } = useTenantStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    companyName: tenant?.companyName || '',
    logoUrl: tenant?.logoUrl || '',
    primaryColor: tenant?.primaryColor || '#1976d2',
    secondaryColor: tenant?.secondaryColor || '#dc004e',
    defaultLanguage: tenant?.defaultLanguage || tenant?.default_language || 'en',
    translationEnabled: tenant?.translationEnabled || tenant?.translation_enabled || false,
  });

  const handleChange = (field: string) => (event: any) => {
    setFormData({ ...formData, [field]: event.target.value });
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!tenant?.id) {
      setError(t('Tenant information not found'));
      return;
    }

    if (user?.role !== 'super_admin') {
      setError(t('Only super admin can update tenant settings'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Update tenant in database
      const { data, error: updateError } = await supabase
        .from('tenants')
        .update({
          company_name: formData.companyName,
          logo_url: formData.logoUrl || null,
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
          default_language: formData.defaultLanguage,
          translation_enabled: formData.translationEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenant.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update tenant in store
      setTenant({
        ...tenant,
        companyName: data.company_name,
        logoUrl: data.logo_url,
        primaryColor: data.primary_color,
        secondaryColor: data.secondary_color,
        defaultLanguage: data.default_language,
        default_language: data.default_language,
        translationEnabled: data.translation_enabled,
        translation_enabled: data.translation_enabled,
      } as any);

      // Change language if updated
      if (formData.defaultLanguage !== i18n.language) {
        i18n.changeLanguage(formData.defaultLanguage);
      }

      setSuccess(t('Tenant settings updated successfully'));
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message || t('Failed to update settings'));
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            {t('Only super admin can access tenant settings')}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          <Business sx={{ mr: 1, verticalAlign: 'middle' }} />
          {t('Tenant Settings')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('Manage your organization branding and preferences')}
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Logo URL */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              <Upload sx={{ mr: 1, verticalAlign: 'middle' }} />
              {t('Company Logo')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar
                src={formData.logoUrl}
                alt={formData.companyName}
                sx={{ width: 100, height: 100 }}
                variant="rounded"
              >
                <Business fontSize="large" />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label={t('Logo URL')}
                  placeholder="https://example.com/logo.png"
                  value={formData.logoUrl}
                  onChange={handleChange('logoUrl')}
                  helperText={t('Enter a public URL to your company logo (PNG, JPG, SVG)')}
                />
              </Box>
            </Box>
          </Grid>

          {/* Company Name */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('Company Name')}
              value={formData.companyName}
              onChange={handleChange('companyName')}
              required
            />
          </Grid>

          {/* Primary Color */}
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                <Palette sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18 }} />
                {t('Primary Color')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={handleChange('primaryColor')}
                  style={{ width: 60, height: 40, cursor: 'pointer', border: 'none' }}
                />
                <TextField
                  value={formData.primaryColor}
                  onChange={handleChange('primaryColor')}
                  size="small"
                  sx={{ flex: 1 }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Secondary Color */}
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                <Palette sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18 }} />
                {t('Secondary Color')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={handleChange('secondaryColor')}
                  style={{ width: 60, height: 40, cursor: 'pointer', border: 'none' }}
                />
                <TextField
                  value={formData.secondaryColor}
                  onChange={handleChange('secondaryColor')}
                  size="small"
                  sx={{ flex: 1 }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Translation Enabled */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.translationEnabled}
                  onChange={(e) => setFormData({ ...formData, translationEnabled: e.target.checked })}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    <LanguageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    {t('enableArabicTranslation')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('allowUsersToSwitchLanguage')}
                  </Typography>
                </Box>
              }
            />
          </Grid>

          {/* Default Language */}
          <Grid item xs={12} style={{ display: formData.translationEnabled ? 'block' : 'none' }}>
            <FormControl fullWidth>
              <InputLabel>
                <LanguageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                {t('Default Language')}
              </InputLabel>
              <Select
                value={formData.defaultLanguage}
                onChange={handleChange('defaultLanguage')}
                label={t('Default Language')}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="ar">العربية (Arabic)</MenuItem>
                <MenuItem value="hi">हिन्दी (Hindi)</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {t('This will be the default language for all new users')}
            </Typography>
          </Grid>

          {/* Save Button */}
          <Grid item xs={12}>
            <Button
              variant="contained"
              size="large"
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              onClick={handleSave}
              disabled={loading}
              fullWidth
            >
              {loading ? t('Saving...') : t('Save Changes')}
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
