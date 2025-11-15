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
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import DashboardOverview from '../components/admin/DashboardOverview';
import VisitsManagement from '../components/admin/VisitsManagement';
import ProductsManagement from '../components/admin/ProductsManagement';
import SalesmenManagement from '../components/admin/SalesmenManagement';
import CustomersManagement from '../components/admin/CustomersManagement';
import ReportsManagement from '../components/admin/ReportsManagement';
import TargetsManagement from '../components/admin/TargetsManagement';
import TargetsDashboard from '../components/admin/TargetsDashboard';

const drawerWidth = 260;

type TabType = 'dashboard' | 'visits' | 'products' | 'salesmen' | 'customers' | 'reports' | 'targets' | 'performance';

export default function AdminDashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuthStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'visits' as TabType, label: 'Visits', icon: <ReceiptIcon /> },
    { id: 'products' as TabType, label: 'Products', icon: <InventoryIcon /> },
    { id: 'salesmen' as TabType, label: 'Salesmen', icon: <PeopleIcon /> },
    { id: 'customers' as TabType, label: 'Customers', icon: <PersonIcon /> },
    { id: 'targets' as TabType, label: 'Targets', icon: <FlagIcon /> },
    { id: 'performance' as TabType, label: 'Performance', icon: <AssessmentIcon /> },
    { id: 'reports' as TabType, label: 'Reports', icon: <AssessmentIcon /> },
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
            padding: '8px 12px',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Box
            component="img"
            src="/hylite-logo.svg"
            alt="Hylite"
            sx={{
              height: 32,
              width: 'auto',
            }}
          />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Hylite FSM
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            Admin Portal
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
          ml: { md: `${drawerWidth}px` },
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
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.name}
            </Typography>
            <IconButton onClick={handleMenuOpen} size="large">
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                {user?.name.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={handleMenuClose}>
              <AccountCircle sx={{ mr: 1 }} /> Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} /> Logout
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
        {activeTab === 'dashboard' && <DashboardOverview />}
        {activeTab === 'visits' && <VisitsManagement />}
        {activeTab === 'products' && <ProductsManagement />}
        {activeTab === 'salesmen' && <SalesmenManagement />}
        {activeTab === 'customers' && <CustomersManagement />}
        {activeTab === 'targets' && <TargetsManagement />}
        {activeTab === 'performance' && <TargetsDashboard />}
        {activeTab === 'reports' && <ReportsManagement />}
      </Box>
    </Box>
  );
}
