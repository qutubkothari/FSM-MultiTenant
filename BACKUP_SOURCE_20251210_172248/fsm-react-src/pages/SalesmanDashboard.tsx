import { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import {
  Home as HomeIcon,
  AddCircle as AddCircleIcon,
  History as HistoryIcon,
  AccountCircle,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useTenantStore } from '../store/tenantStore';
import SalesmanHome from '../components/salesman/SalesmanHome';
import NewVisitForm from '../components/salesman/NewVisitForm';
import VisitHistory from '../components/salesman/VisitHistory';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { getBilingualDisplay } from '../utils/arabicUtils';
import { APP_VERSION } from '../version';

type TabType = 'home' | 'new-visit' | 'history';

export default function SalesmanDashboard() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const { user, logout } = useAuthStore();
  const { tenant } = useTenantStore();

  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
    // Refresh home stats when switching back to home
    if (newTab === 'home') {
      setHomeRefreshKey(prev => prev + 1);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Toolbar>
          <Box
            sx={{
              background: 'white',
              padding: '6px 12px',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              mr: 2,
            }}
          >
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.companyName || 'Company Logo'} style={{ height: '32px', width: 'auto' }} />
            ) : (
              <Typography variant="h6" fontWeight={600}>
                {tenant?.companyName || 'FSM'}
              </Typography>
            )}
          </Box>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {tenant?.companyName || 'FSM'}
          </Typography>
          <Box sx={{ mr: 2 }}>
            <LanguageSwitcher />
          </Box>
          <IconButton onClick={handleMenuOpen} size="large" color="inherit">
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              {getBilingualDisplay(user?.name || '', user?.name_ar, i18n.language === 'ar')?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem disabled>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {getBilingualDisplay(user?.name || '', user?.name_ar, i18n.language === 'ar')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.phone}
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <AccountCircle sx={{ mr: 1 }} /> {t('profile')}
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} /> {t('logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: 7,
          mb: 7,
          bgcolor: 'background.default',
          overflow: 'auto',
        }}
      >
        {activeTab === 'home' && <SalesmanHome key={homeRefreshKey} />}
        {activeTab === 'new-visit' && <NewVisitForm onSuccess={() => handleTabChange('history')} />}
        {activeTab === 'history' && <VisitHistory />}
        
        {/* Version */}
        <Box sx={{ textAlign: 'center', py: 2, pb: 10 }}>
          <Typography variant="caption" color="text.secondary">
            v{APP_VERSION}
          </Typography>
        </Box>
      </Box>

      {/* Bottom Navigation */}
      <Paper
        sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}
        elevation={8}
      >
        <BottomNavigation
          value={activeTab}
          onChange={(_, newValue) => handleTabChange(newValue)}
          sx={{
            height: 64,
            '& .Mui-selected': {
              color: '#667eea !important',
            },
          }}
        >
          <BottomNavigationAction
            label={t('dashboard')}
            value="home"
            icon={<HomeIcon />}
          />
          <BottomNavigationAction
            label={t('newVisit')}
            value="new-visit"
            icon={<AddCircleIcon sx={{ fontSize: 32 }} />}
          />
          <BottomNavigationAction
            label={t('visits')}
            value="history"
            icon={<HistoryIcon />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
