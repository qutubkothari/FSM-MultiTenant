import { useState } from 'react';
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
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Person as PersonIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { supabase } from '../services/supabase';

export default function LoginPage() {
  const { t } = useTranslation();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone || phone.length < 10) {
      setError(t('enterValidPhone'));
      return;
    }

    if (!password || password.length < 6) {
      setError(t('passwordMinLength'));
      return;
    }

    setLoading(true);
    try {
      await login(phone, password);
      // Success - will redirect via App.tsx
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.message || t('invalidCredentials');
      setError(errorMessage);
      setLoading(false);
      // Keep the error visible
      setTimeout(() => {
        // Don't auto-clear the error
      }, 100);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    if (!registerData.phone || registerData.phone.length < 10) {
      setRegisterError(t('enterValidPhone'));
      return;
    }

    if (!registerData.name || registerData.name.trim().length < 2) {
      setRegisterError(t('enterYourName'));
      return;
    }

    if (!registerData.password || registerData.password.length < 6) {
      setRegisterError(t('passwordMinLength'));
      return;
    }

    setLoading(true);
    try {
      // Insert into users table
      const { error } = await supabase
        .from('users')
        .insert([
          {
            phone: registerData.phone,
            name: registerData.name.trim(),
            password: registerData.password,
            role: registerData.role,
          },
        ])
        .select();

      if (error) {
        if (error.message.includes('duplicate') || error.code === '23505') {
          setRegisterError(t('phoneAlreadyRegistered'));
        } else {
          setRegisterError(error.message);
        }
        setLoading(false);
        return;
      }

      setRegisterSuccess(t('registrationSuccessful'));
      setTimeout(() => {
        setRegisterOpen(false);
        setRegisterSuccess('');
        setRegisterData({ phone: '', name: '', password: '', role: 'salesman' });
      }, 2000);
    } catch (err: any) {
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
        {/* Language Switcher - Top Right */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <LanguageSwitcher />
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
          {/* Logo & Title */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography
              sx={{
                fontSize: '3rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#1976d2',
                mb: 2,
              }}
            >
              HYL<span style={{ color: '#D32F2F' }}>i</span>TE
            </Typography>
            <Typography
              variant="h4"
              gutterBottom
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Field Sales Management
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {t('fieldSalesManagement')}
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
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
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
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {t('dontHaveAccount')}{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => setRegisterOpen(true)}
                  sx={{
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {t('register')}
                </Link>
              </Typography>
            </Box>
          </form>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {t('professionalFieldSales')}
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
