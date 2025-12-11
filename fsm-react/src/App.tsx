import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import SuperAdminRegistration from './pages/SuperAdminRegistration';
import AdminDashboard from './pages/AdminDashboard';
import SalesmanDashboard from './pages/SalesmanDashboard';
import OfflineIndicator from './components/OfflineIndicator';
import { Box, CircularProgress } from '@mui/material';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { syncManager } from './services/syncManager';

function App() {
  const { user, isLoading } = useAuthStore();
  const { i18n } = useTranslation();

  // Set HTML dir attribute based on language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Initialize sync manager when user logs in
  useEffect(() => {
    if (user) {
      console.log('🚀 User logged in, initializing sync manager...');
      syncManager.init().catch(error => {
        console.error('Failed to initialize sync manager:', error);
      });

      return () => {
        syncManager.stop();
      };
    }
  }, [user]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {/* Offline sync indicator */}
      {user && <OfflineIndicator />}
      
      <Routes>
        <Route path="/register" element={!user ? <SuperAdminRegistration /> : <Navigate to="/" />} />
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route
          path="/"
          element={
            user ? (
              user.role === 'admin' || user.role === 'super_admin' ? <AdminDashboard /> : <SalesmanDashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;
