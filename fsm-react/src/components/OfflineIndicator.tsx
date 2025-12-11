/**
 * Offline Indicator Component
 * Shows network status and pending sync count
 */

import { useState, useEffect } from 'react';
import { 
  Box, 
  Chip, 
  IconButton, 
  Snackbar, 
  Alert, 
  CircularProgress,
  Popover,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import { WifiOff, CloudOff, CloudSync, CloudDone, Refresh, Info } from '@mui/icons-material';
import { syncManager } from '../services/syncManager';
import { offlineStorage } from '../services/offlineStorage';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [pendingVisits, setPendingVisits] = useState<any[]>([]);

  // Update online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending count every 5 seconds
  useEffect(() => {
    const updateStatus = async () => {
      const status = await syncManager.getSyncStatus();
      setPendingCount(status.pendingCount);
      setIsSyncing(status.isSyncing);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    setAnchorEl(null); // Close popover
    try {
      const result = await syncManager.forceSyncNow();
      setSyncMessage(`Synced ${result.success} visits successfully`);
      setShowSyncSuccess(true);
      
      // Update pending count
      const status = await syncManager.getSyncStatus();
      setPendingCount(status.pendingCount);
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleShowDetails = async (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // Load pending visits
    const visits = await offlineStorage.getAllOfflineVisits();
    setPendingVisits(visits);
  };

  const handleCloseDetails = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  // Don't show anything if online and nothing pending
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          top: 70,
          right: 16,
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {/* Offline indicator */}
        {!isOnline && (
          <Chip
            icon={<WifiOff />}
            label="Offline"
            color="error"
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
        )}

        {/* Pending visits indicator */}
        {pendingCount > 0 && (
          <>
            <Chip
              icon={isSyncing ? <CircularProgress size={16} /> : <CloudOff />}
              label={`${pendingCount} visit${pendingCount > 1 ? 's' : ''} pending sync`}
              color={isSyncing ? 'info' : 'warning'}
              size="small"
              onClick={handleShowDetails}
              sx={{ 
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            />
            
            {/* Details button */}
            <IconButton
              size="small"
              onClick={handleShowDetails}
              title="View pending visits"
              sx={{
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Info fontSize="small" />
            </IconButton>
          </>
        )}

        {/* Manual sync button */}
        {isOnline && pendingCount > 0 && !isSyncing && (
          <IconButton
            size="small"
            color="primary"
            onClick={handleManualSync}
            title="Sync now"
            sx={{
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Refresh />
          </IconButton>
        )}

        {/* Syncing indicator */}
        {isSyncing && (
          <Chip
            icon={<CloudSync />}
            label="Syncing..."
            color="info"
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
        )}
      </Box>

      {/* Success message */}
      <Snackbar
        open={showSyncSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSyncSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSyncSuccess(false)}
          severity="success"
          icon={<CloudDone />}
          sx={{ width: '100%' }}
        >
          {syncMessage}
        </Alert>
      </Snackbar>

      {/* Pending visits details popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleCloseDetails}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ width: 350, maxHeight: 400, overflow: 'auto' }}>
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography variant="h6" gutterBottom>
              Pending Visits ({pendingCount})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              These visits will sync when you're online
            </Typography>
          </Box>
          
          <Divider />
          
          <List sx={{ py: 0 }}>
            {pendingVisits.map((visit, index) => (
              <ListItem key={visit.id} divider={index < pendingVisits.length - 1}>
                <ListItemText
                  primary={visit.customer_name}
                  secondary={
                    <>
                      <Typography variant="caption" display="block">
                        Contact: {visit.contact_person || 'N/A'}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Meeting: {Array.isArray(visit.meeting_type) ? visit.meeting_type.join(', ') : visit.meeting_type}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Saved: {new Date(visit.created_at).toLocaleString()}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
          
          {isOnline && pendingCount > 0 && (
            <Box sx={{ p: 2, pt: 1, textAlign: 'center' }}>
              <IconButton
                color="primary"
                onClick={handleManualSync}
                disabled={isSyncing}
                sx={{ 
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                {isSyncing ? <CircularProgress size={24} color="inherit" /> : <Refresh />}
              </IconButton>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Sync Now
              </Typography>
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
}
