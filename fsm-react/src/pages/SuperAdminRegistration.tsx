import React, { useState } from 'react';
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
  InputAdornment,
  IconButton,
  CircularProgress,
  Step,
  Stepper,
  StepLabel,
  Snackbar,
} from '@mui/material';
import { Visibility, VisibilityOff, Business, Phone, Lock, Person } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../services/supabase';
import { useTenantStore } from '../store/tenantStore';
import { useAuthStore } from '../store/authStore';
import { normalizeArabicNumerals } from '../utils/arabicUtils';

interface RegistrationData {
  companyName: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
  superAdminName: string;
  language: string;
}

export default function SuperAdminRegistration() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setTenant } = useTenantStore();
  const { setUser } = useAuthStore();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<RegistrationData>({
    companyName: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
    superAdminName: '',
    language: 'en',
  });

  const steps = [t('Company Details'), t('Admin Account'), t('Preferences')];

  const handleChange = (field: keyof RegistrationData) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    setFormData({ ...formData, [field]: event.target.value });
    setError('');
  };

  const handleLanguageChange = (event: any) => {
    const newLang = event.target.value;
    setFormData({ ...formData, language: newLang });
    i18n.changeLanguage(newLang);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Company Details
        if (!formData.companyName.trim()) {
          setError(t('Company name is required'));
          return false;
        }
        if (formData.companyName.trim().length < 3) {
          setError(t('Company name must be at least 3 characters'));
          return false;
        }
        return true;

      case 1: // Admin Account
        if (!formData.mobileNumber.trim()) {
          setError(t('Mobile number is required'));
          return false;
        }
        if (!/^\+?[\d\s-]{10,}$/.test(formData.mobileNumber)) {
          setError(t('Invalid mobile number format'));
          return false;
        }
        if (!formData.superAdminName.trim()) {
          setError(t('Admin name is required'));
          return false;
        }
        if (!formData.password) {
          setError(t('Password is required'));
          return false;
        }
        if (formData.password.length < 6) {
          setError(t('Password must be at least 6 characters'));
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError(t('Passwords do not match'));
          return false;
        }
        return true;

      case 2: // Preferences
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError('');
  };

  const generateSlug = (companyName: string): string => {
    return companyName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  };

  const handleRegister = async () => {
    if (!validateStep(2)) return;

    setLoading(true);
    setError('');

    try {
      const slug = generateSlug(formData.companyName);
      console.log('Starting registration process...', { slug, formData });

      // Step 1: Check if slug already exists
      console.log('Step 1: Checking for existing tenant...');
      const { data: existingTenant, error: tenantCheckError } = await supabase
        .from('tenants')
        .select('slug')
        .eq('slug', slug)
        .single();

      if (tenantCheckError && tenantCheckError.code !== 'PGRST116') {
        console.error('Error checking tenant:', tenantCheckError);
        throw tenantCheckError;
      }

      if (existingTenant) {
        console.log('Tenant already exists:', existingTenant);
        const errorMsg = t('A company with this name already exists. Please choose a different name.');
        setError(errorMsg);
        setSnackbarOpen(true);
        setLoading(false);
        return;
      }

      // Step 2: Check if mobile number already exists
      console.log('Step 2: Checking for existing user...');
      // Normalize mobile number to handle Arabic numerals
      const normalizedMobile = normalizeArabicNumerals(formData.mobileNumber);
      const { data: existingUser, error: userCheckError} = await supabase
        .from('users')
        .select('phone')
        .eq('phone', normalizedMobile)
        .single();

      if (userCheckError && userCheckError.code !== 'PGRST116') {
        console.error('Error checking user:', userCheckError);
        throw userCheckError;
      }

      if (existingUser) {
        console.log('User already exists:', existingUser);
        const errorMsg = t('This mobile number is already registered');
        setError(errorMsg);
        setSnackbarOpen(true);
        setLoading(false);
        return;
      }

      // Step 3: Create tenant
      console.log('Step 3: Creating tenant...');
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: formData.companyName,
          slug: slug,
          company_name: formData.companyName,
          is_active: true,
          primary_color: '#1976d2',
          secondary_color: '#dc004e',
        })
        .select()
        .single();

      if (tenantError) {
        console.error('Error creating tenant:', tenantError);
        throw tenantError;
      }
      console.log('Tenant created successfully:', newTenant);

      // Step 4: Create super admin user
      console.log('Step 4: Creating super admin user...');
      // Normalize password to handle Arabic numerals
      const normalizedPassword = normalizeArabicNumerals(formData.password);
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          phone: normalizedMobile,
          name: formData.superAdminName,
          password: normalizedPassword, // In production, hash this password
          role: 'super_admin',
          tenant_id: newTenant.id,
          is_active: true,
          preferred_language: formData.language,
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating user:', userError);
        // Rollback: Delete tenant if user creation fails
        console.log('Rolling back tenant creation...');
        await supabase.from('tenants').delete().eq('id', newTenant.id);
        throw userError;
      }
      console.log('User created successfully:', newUser);

      // Step 5: Create corresponding salesman record
      console.log('Step 5: Creating salesman record...');
      const { error: salesmanError } = await supabase
        .from('salesmen')
        .insert({
          name: formData.superAdminName,
          phone: normalizedMobile,
          tenant_id: newTenant.id,
          is_active: true,
          is_admin: true,
        });

      if (salesmanError) {
        console.error('Failed to create salesman record:', salesmanError);
        // Don't fail registration if salesman creation fails
      } else {
        console.log('Salesman record created successfully');
      }

      // Step 6: Set tenant and user in stores
      console.log('Step 6: Setting tenant and user in stores...');
      setTenant({
        id: newTenant.id,
        name: newTenant.name,
        slug: newTenant.slug,
        companyName: newTenant.company_name,
        primaryColor: newTenant.primary_color,
        secondaryColor: newTenant.secondary_color,
        isActive: newTenant.is_active,
        logoUrl: newTenant.logo_url,
      });

      setUser({
        id: newUser.id,
        phone: newUser.phone,
        name: newUser.name,
        role: newUser.role as 'admin' | 'salesman' | 'super_admin',
        tenantId: newUser.tenant_id,
        tenant_id: newUser.tenant_id,
        created_at: newUser.created_at || new Date().toISOString(),
        is_active: true,
        preferred_language: formData.language,
      });

      // Step 7: Change language if not English
      console.log('Step 7: Changing language if needed...', formData.language);
      if (formData.language !== 'en') {
        i18n.changeLanguage(formData.language);
      }

      // Success! Navigate to dashboard
      console.log('Registration completed successfully! Navigating to dashboard...');
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      const errorMsg = err.message || t('Registration failed. Please try again.');
      setError(errorMsg);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label={t('Company Name')}
              value={formData.companyName}
              onChange={handleChange('companyName')}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Business />
                  </InputAdornment>
                ),
              }}
              helperText={t('This will be your organization name')}
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label={t('Your Name')}
              value={formData.superAdminName}
              onChange={handleChange('superAdminName')}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label={t('Mobile Number')}
              value={formData.mobileNumber}
              onChange={handleChange('mobileNumber')}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone />
                  </InputAdornment>
                ),
              }}
              helperText={t('This will be your username')}
            />
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label={t('Password')}
              value={formData.password}
              onChange={handleChange('password')}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label={t('Confirm Password')}
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              required
            />
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl fullWidth>
              <InputLabel>{t('Default Language')}</InputLabel>
              <Select
                value={formData.language}
                onChange={handleLanguageChange}
                label={t('Default Language')}
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="ar">العربية (Arabic)</MenuItem>
                <MenuItem value="hi">हिन्दी (Hindi)</MenuItem>
              </Select>
            </FormControl>
            <Alert severity="info">
              {t('You can change the language anytime from the dashboard')}
            </Alert>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('Registration Summary')}:
              </Typography>
              <Typography variant="body2">
                <strong>{t('Company')}:</strong> {formData.companyName}
              </Typography>
              <Typography variant="body2">
                <strong>{t('Admin')}:</strong> {formData.superAdminName}
              </Typography>
              <Typography variant="body2">
                <strong>{t('Mobile')}:</strong> {formData.mobileNumber}
              </Typography>
              <Typography variant="body2">
                <strong>{t('Language')}:</strong>{' '}
                {formData.language === 'en'
                  ? 'English'
                  : formData.language === 'ar'
                  ? 'العربية'
                  : 'हिन्दी'}
              </Typography>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
            {t('Register Your Company')}
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 4 }}>
            {t('Create your FSM account and start managing your sales team')}
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {renderStepContent(activeStep)}

          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <Button
              disabled={activeStep === 0 || loading}
              onClick={handleBack}
              sx={{ flex: 1 }}
            >
              {t('Back')}
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleRegister}
                disabled={loading}
                sx={{ flex: 1 }}
              >
                {loading ? <CircularProgress size={24} /> : t('Complete Registration')}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext} sx={{ flex: 1 }}>
                {t('Next')}
              </Button>
            )}
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('Already have an account?')}{' '}
              <Button
                size="small"
                onClick={() => navigate('/login')}
                disabled={loading}
              >
                {t('Sign In')}
              </Button>
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="error"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
