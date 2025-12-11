import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  CheckCircle,
  Schedule,
  CurrencyRupee,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { supabase } from '../../services/supabase';
import AIInsights from './AIInsights';
import { useTranslation } from 'react-i18next';
import { getBilingualDisplay } from '../../utils/arabicUtils';
import { syncManager } from '../../services/syncManager';

export default function SalesmanHome() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { tenant } = useTenantStore();
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    completed: 0,
  });
  const [targets, setTargets] = useState({
    visitTarget: 0,
    actualVisits: 0,
    amountTarget: 0,
    actualAmount: 0,
  });

  useEffect(() => {
    loadStats();
    loadTargets();
    
    // Auto-refresh every 10 seconds for live updates
    const refreshInterval = setInterval(() => {
      loadStats();
      loadTargets();
    }, 10000);
    
    // Listen for sync completion to refresh stats
    const unsubscribe = syncManager.onSyncComplete((result) => {
      if (result.success > 0) {
        console.log('✅ Sync completed, refreshing dashboard...');
        loadStats();
        loadTargets();
      }
    });
    
    return () => {
      clearInterval(refreshInterval);
      unsubscribe();
    };
  }, [user, tenant]);

  const loadTargets = async () => {
    if (!user || !tenant?.id) return;
    if (!navigator.onLine) {
      console.log('Offline: skipping target fetch');
      return;
    }
    try {
      console.log('Loading targets for user:', user.phone, 'tenant:', tenant.id);
      
      // Look up salesman by phone number
      const { data: salesman } = await supabase
        .from('salesmen')
        .select('id')
        .eq('phone', user.phone)
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      console.log('Found salesman:', salesman);
      if (!salesman) return;

      // Get current month/year
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      console.log('Looking for targets for month:', month, 'year:', year);

      // Get target for current month
      const { data: targetData } = await supabase
        .from('salesman_targets')
        .select('visits_per_month, order_value_per_month')
        .eq('salesman_id', salesman.id)
        .eq('month', month)
        .eq('year', year)
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      console.log('Target data:', targetData);

      // Get actual visits for current month
      const startOfMonth = new Date(year, month - 1, 1).toISOString();
      const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString();

      const { data: visits } = await supabase
        .from('visits')
        .select('order_value')
        .eq('salesman_id', salesman.id)
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null)
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      console.log('Visits for current month:', visits);

      const actualVisits = visits?.length || 0;
      const actualAmount = visits?.reduce((sum, v) => sum + (parseFloat(v.order_value) || 0), 0) || 0;

      const newTargets = {
        visitTarget: targetData?.visits_per_month || 0,
        actualVisits,
        amountTarget: targetData?.order_value_per_month || 0,
        actualAmount,
      };
      
      console.log('Setting targets:', newTargets);
      setTargets(newTargets);
    } catch (error) {
      console.error('Error loading targets:', error);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    if (!navigator.onLine) {
      console.log('Offline: skipping stats fetch');
      return;
    }
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
        .is('deleted_at', null)
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
              {(user?.name_ar && i18n.language === 'ar' ? user.name_ar : user?.name)?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {t('welcome')}, {getBilingualDisplay(user?.name || '', user?.name_ar, i18n.language === 'ar')}!
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
        {/* Target vs Actual Visits */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" fontWeight={600}>
                  {t('visits')}: {targets.actualVisits} / {targets.visitTarget}
                </Typography>
                <Schedule sx={{ color: '#667eea' }} />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={targets.visitTarget > 0 ? (targets.actualVisits / targets.visitTarget) * 100 : 0} 
                sx={{ 
                  height: 8, 
                  borderRadius: 1,
                  bgcolor: 'rgba(102, 126, 234, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {targets.visitTarget > 0 ? Math.round((targets.actualVisits / targets.visitTarget) * 100) : 0}% {t('achieved')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Target vs Actual Amount */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" fontWeight={600}>
                  {t('orderValue')}: {tenant?.currencySymbol || '$'}{(targets.actualAmount / 1000).toFixed(0)}K / {tenant?.currencySymbol || '$'}{(targets.amountTarget / 1000).toFixed(0)}K
                </Typography>
                <CurrencyRupee sx={{ color: '#4facfe' }} />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={targets.amountTarget > 0 ? (targets.actualAmount / targets.amountTarget) * 100 : 0} 
                sx={{ 
                  height: 8, 
                  borderRadius: 1,
                  bgcolor: 'rgba(79, 172, 254, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {targets.amountTarget > 0 ? Math.round((targets.actualAmount / targets.amountTarget) * 100) : 0}% {t('achieved')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

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
