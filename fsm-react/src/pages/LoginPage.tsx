import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Link,
  IconButton,
  Menu,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { normalizeArabicNumerals } from '../utils/arabicUtils';
import { APP_VERSION, BUILD_DATE } from '../version';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerData, setRegisterData] = useState({
    phone: '',
    name: '',
    password: '',
    role: 'salesman' as 'admin' | 'salesman',
  });
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const login = useAuthStore((state) => state.login);
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);

  // Force English on login page load ONLY ONCE
  useEffect(() => {
    const currentLang = localStorage.getItem('i18nextLng');
    if (!currentLang || currentLang !== 'en') {
      i18n.changeLanguage('en');
      localStorage.setItem('i18nextLng', 'en');
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    }
  }, []); // Empty dependency array - run only once on mount

  const handleLanguageMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setLangMenuAnchor(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setLangMenuAnchor(null);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    handleLanguageMenuClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔥🔥🔥 LOGIN PAGE: Form submitted - NEW CODE v2');
    console.log('Login form submitted');
    
    // Clear previous error
    setError('');

    // Normalize phone to handle Arabic numerals
    const normalizedPhone = normalizeArabicNumerals(phone);
    
    if (!normalizedPhone || normalizedPhone.length < 10) {
      const msg = t('enterValidPhone');
      console.log('Validation error:', msg);
      setError(msg);
      setLoading(false);
      return;
    }

    // Normalize password to handle Arabic numerals
    const normalizedPassword = normalizeArabicNumerals(password);
    
    if (!normalizedPassword || normalizedPassword.length < 6) {
      const msg = t('passwordMinLength');
      console.log('Validation error:', msg);
      setError(msg);
      setLoading(false);
      return;
    }

    console.log('🔥🔥🔥 LOGIN PAGE: Calling authStore.login()');
    console.log('Attempting login with phone:', normalizedPhone);
    setLoading(true);
    
    try {
      await login(normalizedPhone, normalizedPassword);
      console.log('🔥🔥🔥 LOGIN PAGE: Login completed successfully');
      console.log('Login successful');
      // Success - will redirect via App.tsx
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err?.message || t('invalidCredentials');
      console.log('Setting error message:', errorMessage);
      
      // Set loading false
      setLoading(false);
      
      // Set error state
      setError(errorMessage);
      console.log('Error state set to:', errorMessage);
      
      // Force DOM update with direct manipulation as backup
      setTimeout(() => {
        const formElement = document.querySelector('form');
        if (formElement) {
          let errorDiv = document.getElementById('login-error-display');
          if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'login-error-display';
            errorDiv.style.cssText = 'background-color: #f44336; color: white; padding: 16px; margin: 16px 0; border-radius: 4px; font-weight: bold; text-align: center;';
            const submitButton = formElement.querySelector('button[type="submit"]');
            if (submitButton) {
              formElement.insertBefore(errorDiv, submitButton);
            }
          }
          errorDiv.textContent = '⚠️ ' + errorMessage;
          errorDiv.style.display = 'block';
        }
      }, 100);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    console.log('Starting user registration...', { phone: registerData.phone, name: registerData.name, role: registerData.role });

    // Normalize phone and password to handle Arabic numerals
    const normalizedPhone = normalizeArabicNumerals(registerData.phone);
    const normalizedPassword = normalizeArabicNumerals(registerData.password);

    if (!normalizedPhone || normalizedPhone.length < 10) {
      console.log('Validation failed: Invalid phone number');
      setRegisterError(t('enterValidPhone'));
      return;
    }

    if (!registerData.name || registerData.name.trim().length < 2) {
      console.log('Validation failed: Invalid name');
      setRegisterError(t('enterYourName'));
      return;
    }

    if (!normalizedPassword || normalizedPassword.length < 6) {
      console.log('Validation failed: Password too short');
      setRegisterError(t('passwordMinLength'));
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to insert user into database...');
      // Insert into users table
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            phone: normalizedPhone,
            name: registerData.name.trim(),
            password: normalizedPassword,
            role: registerData.role,
          },
        ])
        .select();

      if (error) {
        console.error('Database error during registration:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        if (error.message.includes('duplicate') || error.code === '23505') {
          setRegisterError(t('phoneAlreadyRegistered'));
        } else {
          setRegisterError(error.message);
        }
        setLoading(false);
        return;
      }

      console.log('User registered successfully:', data);
      setRegisterSuccess(t('registrationSuccessful'));
      setTimeout(() => {
        setRegisterOpen(false);
        setRegisterSuccess('');
        setRegisterData({ phone: '', name: '', password: '', role: 'salesman' });
      }, 2000);
    } catch (err: any) {
      console.error('Unexpected error during registration:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      setRegisterError(err.message || t('registrationFailed'));
    }
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        {/* Language Switcher - Top Right - Always visible on login page */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <IconButton
            color="inherit"
            onClick={handleLanguageMenuOpen}
            sx={{
              border: '1px solid rgba(255,255,255,0.5)',
              borderRadius: 2,
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            <LanguageIcon />
            <Typography variant="body2" sx={{ ml: 1, fontWeight: 600 }}>
              {i18n.language === 'ar' ? 'عربي' : 'EN'}
            </Typography>
          </IconButton>
          <Menu
            anchorEl={langMenuAnchor}
            open={Boolean(langMenuAnchor)}
            onClose={handleLanguageMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={() => changeLanguage('en')}>
              <Typography>English</Typography>
            </MenuItem>
            <MenuItem onClick={() => changeLanguage('ar')}>
              <Typography>العربية</Typography>
            </MenuItem>
          </Menu>
        </Box>
        
        <Paper
          elevation={24}
          sx={{
            padding: { xs: 3, sm: 5 },
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Logo - Independent Container */}

          <Box sx={{ textAlign: 'center', mb: { xs: 2, md: -8 } }}>
            <img
              src="/sak-ai-logo-with-company-name-1.png"
              alt="SAK Solutions"
              style={{
                height: window.innerWidth < 768 ? '260px' : '320px',
                width: 'auto',
                display: 'block',
                margin: '0 auto',
                marginBottom: window.innerWidth < 768 ? '24px' : '-64px'
              }}
            />
          </Box>

          {/* Text - Independent Container */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography
              sx={{
                color: '#1a3a5c',
                fontWeight: 600,
                fontSize: window.innerWidth < 768 ? '0.9rem' : '1.5rem',
                letterSpacing: '1px',
                fontFamily: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif'
              }}
            >
              SAK FSM
            </Typography>
          </Box>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label={t('phoneNumber')}
              variant="outlined"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder={t('enterPhone')}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon color="primary" />
                  </InputAdornment>
                ),
              }}
              disabled={loading}
            />

            <TextField
              fullWidth
              type="password"
              label={t('password')}
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('enterPassword')}
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="primary" />
                  </InputAdornment>
                ),
              }}
              disabled={loading}
            />

            {error && (
              <>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: 600,
                    fontSize: '0.95rem'
                  }}
                >
                  {error}
                </Alert>
                <Box
                  sx={{
                    mb: 3,
                    p: 2,
                    backgroundColor: '#ffebee',
                    border: '2px solid #f44336',
                    borderRadius: 1,
                    color: '#c62828',
                    fontWeight: 600,
                    textAlign: 'center'
                  }}
                >
                  ⚠️ {error}
                </Box>
              </>
            )}

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  boxShadow: '0 6px 24px rgba(102, 126, 234, 0.5)',
                },
              }}
            >
              {loading ? t('loading') : t('login')}
            </Button>

            {/* Register Link */}
              {window.innerWidth >= 768 && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    New company?{' '}
                    <Link
                      component="button"
                      type="button"
                      variant="body2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate('/register');
                      }}
                      sx={{
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      Register your company
                    </Link>
                  </Typography>
                </Box>
              )}
          </form>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {t('professionalFieldSales')}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1, fontSize: '0.7rem' }}>
              v{APP_VERSION} • {BUILD_DATE}
            </Typography>
          </Box>
        </Paper>

        {/* Registration Dialog */}
        <Dialog 
          open={registerOpen} 
          onClose={() => setRegisterOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" fontWeight={600}>
              {t('register')}
            </Typography>
          </DialogTitle>
          <form onSubmit={handleRegister}>
            <DialogContent>
              <TextField
                fullWidth
                label={t('phoneNumber')}
                variant="outlined"
                value={registerData.phone}
                onChange={(e) => setRegisterData({
                  ...registerData,
                  phone: e.target.value.replace(/\D/g, '').slice(0, 10)
                })}
                placeholder={t('enterPhone')}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                disabled={loading}
                required
              />

              <TextField
                fullWidth
                label={t('name')}
                variant="outlined"
                value={registerData.name}
                onChange={(e) => setRegisterData({
                  ...registerData,
                  name: e.target.value
                })}
                placeholder={t('enterName')}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                disabled={loading}
                required
              />

              <TextField
                fullWidth
                type="password"
                label={t('password')}
                variant="outlined"
                value={registerData.password}
                onChange={(e) => setRegisterData({
                  ...registerData,
                  password: e.target.value
                })}
                placeholder={t('enterPassword')}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                disabled={loading}
                required
              />

              <TextField
                fullWidth
                select
                label={t('role')}
                value={registerData.role}
                onChange={(e) => setRegisterData({
                  ...registerData,
                  role: e.target.value as 'admin' | 'salesman'
                })}
                sx={{ mb: 2 }}
                disabled={loading}
                required
              >
                <MenuItem value="salesman">{t('salesman')}</MenuItem>
                <MenuItem value="admin">{t('admin')}</MenuItem>
              </TextField>

              {registerError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {registerError}
                </Alert>
              )}

              {registerSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {registerSuccess}
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => setRegisterOpen(false)} 
                disabled={loading}
              >
                {t('cancel')}
              </Button>
              <Button 
                type="submit" 
                variant="contained"
                disabled={loading}
              >
                {loading ? t('loading') : t('register')}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </Box>
  );
}
