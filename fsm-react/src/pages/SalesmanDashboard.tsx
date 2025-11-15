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
import SalesmanHome from '../components/salesman/SalesmanHome';
import NewVisitForm from '../components/salesman/NewVisitForm';
import VisitHistory from '../components/salesman/VisitHistory';

type TabType = 'home' | 'new-visit' | 'history';

export default function SalesmanDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout } = useAuthStore();

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
              padding: '4px 10px',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              mr: 2,
            }}
          >
            <Box
              component="img"
              src="/hylite-logo.svg"
              alt="Hylite"
              sx={{
                height: 26,
                width: 'auto',
              }}
            />
          </Box>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Hylite FSM
          </Typography>
          <IconButton onClick={handleMenuOpen} size="large" color="inherit">
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              {user?.name.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem disabled>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {user?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.phone}
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <AccountCircle sx={{ mr: 1 }} /> Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} /> Logout
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
        {activeTab === 'home' && <SalesmanHome />}
        {activeTab === 'new-visit' && <NewVisitForm onSuccess={() => setActiveTab('history')} />}
        {activeTab === 'history' && <VisitHistory />}
      </Box>

      {/* Bottom Navigation */}
      <Paper
        sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}
        elevation={8}
      >
        <BottomNavigation
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            height: 64,
            '& .Mui-selected': {
              color: '#667eea !important',
            },
          }}
        >
          <BottomNavigationAction
            label="Home"
            value="home"
            icon={<HomeIcon />}
          />
          <BottomNavigationAction
            label="New Visit"
            value="new-visit"
            icon={<AddCircleIcon sx={{ fontSize: 32 }} />}
          />
          <BottomNavigationAction
            label="History"
            value="history"
            icon={<HistoryIcon />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
