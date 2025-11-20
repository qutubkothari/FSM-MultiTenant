import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
} from '@mui/material';
import {
  TrendingUp,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../services/supabase';
import AIInsights from './AIInsights';
import { useTranslation } from 'react-i18next';

export default function SalesmanHome() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    completed: 0,
  });

  useEffect(() => {
    loadStats();
    
    // Auto-refresh every 10 seconds for live updates
    const refreshInterval = setInterval(() => {
      loadStats();
    }, 10000);
    
    return () => clearInterval(refreshInterval);
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    try {
      // Look up salesman by phone number
      const { data: salesman } = await supabase
        .from('salesmen')
        .select('id')
        .eq('phone', user.phone)
        .maybeSingle();

      if (!salesman) {
        console.error('Salesman not found for phone:', user.phone);
        return;
      }

      // Only load recent visits for faster performance
      const { data: visits } = await supabase
        .from('visits')
        .select('id, created_at, status, salesman_id')
        .eq('salesman_id', salesman.id)
        .order('created_at', { ascending: false })
        .limit(100);

      const today = new Date().toISOString().split('T')[0];
      const visitsList = visits || [];
      const todayVisits = visitsList.filter((v: any) => v.created_at.startsWith(today));
      const completedVisits = visitsList.filter((v: any) => v.status === 'completed');

      setStats({
        total: visitsList.length,
        today: todayVisits.length,
        completed: completedVisits.length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Welcome Section */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                fontSize: '1.5rem',
              }}
            >
              {user?.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {t('welcome')}, {user?.name}!
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {t('readyToMakeSales')}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    {t('todaysVisits')}
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.today}
                  </Typography>
                </Box>
                <Schedule sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    {t('completed')}
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.completed}
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    {t('totalVisitsCount')}
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.total}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {t('quickTips')}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            • {t('useNewVisitTab')}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            • {t('gpsAutoCaptured')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • {t('checkHistory')}
          </Typography>
        </CardContent>
      </Card>

      {/* AI Insights Section */}
      <Box sx={{ mt: 3 }}>
        <AIInsights />
      </Box>
    </Box>
  );
}
