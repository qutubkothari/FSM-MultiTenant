import { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  AccountCircle,
  Assessment as AssessmentIcon,
  Flag as FlagIcon,
  Settings as SettingsIcon,
  Factory as FactoryIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useTenantStore } from '../store/tenantStore';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { getBilingualDisplay } from '../utils/arabicUtils';
import { APP_VERSION } from '../version';

// Direct imports - no lazy loading for instant tab switching
import VisitsManagement from '../components/admin/VisitsManagement';
import ProductsManagement from '../components/admin/ProductsManagement';
import SalesmenManagement from '../components/admin/SalesmenManagement';
import CustomersManagement from '../components/admin/CustomersManagement';
import ReportsManagement from '../components/admin/ReportsManagement';
import TargetsManagement from '../components/admin/TargetsManagement';
import TenantSettings from '../components/admin/TenantSettings';
import FastDashboard from '../components/admin/FastDashboard';
import PlantsManagement from '../components/admin/PlantsManagement';

const drawerWidth = 260;

type TabType = 'dashboard' | 'visits' | 'products' | 'salesmen' | 'customers' | 'reports' | 'targets' | 'plants' | 'settings';

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuthStore();
  const { tenant } = useTenantStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Check if current language is RTL
  const isRTL = i18n.language === 'ar';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
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

  const menuItems = [
    { id: 'dashboard' as TabType, label: t('dashboard'), icon: <DashboardIcon /> },
    { id: 'visits' as TabType, label: t('visits'), icon: <ReceiptIcon /> },
    { id: 'products' as TabType, label: t('products'), icon: <InventoryIcon /> },
    { id: 'salesmen' as TabType, label: t('salesmen'), icon: <PeopleIcon /> },
    { id: 'customers' as TabType, label: t('customers'), icon: <PersonIcon /> },
    { id: 'plants' as TabType, label: t('plants'), icon: <FactoryIcon /> },
    { id: 'targets' as TabType, label: t('targets'), icon: <FlagIcon /> },
    { id: 'reports' as TabType, label: t('reports'), icon: <AssessmentIcon /> },
    ...(user?.role === 'super_admin' ? [{ id: 'settings' as TabType, label: t('settings'), icon: <SettingsIcon /> }] : []),
  ];

  const drawer = (
    <Box>
      <Box
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box
          sx={{
            background: 'white',
            padding: '8px 14px',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {tenant?.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.companyName || 'Company Logo'} style={{ height: '48px', width: 'auto' }} />
          ) : (
            <Typography variant="h6" fontWeight={700}>
              {tenant?.companyName || 'FSM'}
            </Typography>
          )}
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {tenant?.companyName || 'FSM'}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            {t('adminPortal')}
          </Typography>
        </Box>
      </Box>
      <Divider />
      <List sx={{ px: 2, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              selected={activeTab === item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ color: activeTab === item.id ? 'white' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ...(isRTL ? { mr: { md: `${drawerWidth}px` } } : { ml: { md: `${drawerWidth}px` } }),
          background: 'white',
          color: 'text.primary',
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {menuItems.find((item) => item.id === activeTab)?.label}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LanguageSwitcher />
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {getBilingualDisplay(user?.name || '', user?.name_ar, i18n.language === 'ar')}
            </Typography>
            <IconButton onClick={handleMenuOpen} size="large">
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                {getBilingualDisplay(user?.name || '', user?.name_ar, i18n.language === 'ar')?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={handleMenuClose}>
              <AccountCircle sx={{ mr: 1 }} /> {t('profile')}
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} /> {t('logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
        <Divider />
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          anchor={isRTL ? 'right' : 'left'}
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          anchor={isRTL ? 'right' : 'left'}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        {activeTab === 'dashboard' && <FastDashboard />}
        {activeTab === 'visits' && <VisitsManagement />}
        {activeTab === 'products' && <ProductsManagement />}
        {activeTab === 'salesmen' && <SalesmenManagement />}
        {activeTab === 'customers' && <CustomersManagement />}
        {activeTab === 'plants' && <PlantsManagement />}
        {activeTab === 'targets' && <TargetsManagement />}
        {activeTab === 'reports' && <ReportsManagement />}
        {activeTab === 'settings' && <TenantSettings />}
        
        {/* Version Footer */}
        <Box sx={{ mt: 4, pt: 2, textAlign: 'center', borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="caption" color="text.secondary">
            FSM v{APP_VERSION}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
