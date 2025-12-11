import { getBilingualDisplay } from '../../utils/arabicUtils';
import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { supabase } from '../../services/supabase';
import { useTenantStore } from '../../store/tenantStore';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import { usePlantAccess } from '../../hooks/usePlantAccess';

interface PerformanceData {
  salesman_name: string;
  salesman_name_ar?: string;
  target_visits: number;
  actual_visits: number;
  target_orders: number;
  actual_orders: number;
  target_order_value: number;
  actual_order_value: number;
  visits_achievement: number;
  orders_achievement: number;
  order_value_achievement: number;
}

export default function FastDashboard() {
  const { t, i18n } = useTranslation();
  const { tenant } = useTenantStore();
  const { user } = useAuthStore();
  const { filterByPlantAccess, hasAccessToAllPlants } = usePlantAccess();
  const [data, setData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenant?.id) {
      loadData();
    }
  }, [tenant?.id]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    
    console.log('🔍 Starting dashboard load...');
    console.log('Supabase client:', supabase ? 'Available' : 'Not available');
    
    try {
      // Test simple query first
      console.log('Testing simple salesmen query...');
      const testQuery = await supabase.from('salesmen').select('id').limit(1);
      console.log('Test query result:', testQuery);
      
      if (testQuery.error) {
        console.error('❌ Test query failed:', testQuery.error);
        throw new Error(`Database connection failed: ${testQuery.error.message}`);
      }
      
      console.log('✅ Test query successful, fetching full data...');

      // Get tenant ID
      const tenantId = tenant?.id;
      if (!tenantId) {
        throw new Error('No tenant selected. Please select a company.');
      }
      
      console.log('Loading data for tenant:', tenantId);
      
      const [salesmenRes, targetsRes, visitsRes] = await Promise.all([
        supabase.from('salesmen').select('id, name, name_ar, plant').eq('is_admin', false).eq('tenant_id', tenantId).is('deleted_at', null).limit(100),
        supabase.from('salesman_targets').select('*').eq('tenant_id', tenantId).is('deleted_at', null).limit(100),
        supabase.from('visits').select('salesman_id, meeting_type, order_value, plant').eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false }).limit(500)
      ]);

      console.log('Dashboard queries completed');

      if (salesmenRes.error) {
        console.error('Salesmen query error:', salesmenRes.error);
        throw salesmenRes.error;
      }
      if (targetsRes.error) {
        console.error('Targets query error:', targetsRes.error);
        throw targetsRes.error;
      }
      if (visitsRes.error) {
        console.error('Visits query error:', visitsRes.error);
        throw visitsRes.error;
      }

      // Apply plant access filtering
      const allSalesmen = salesmenRes.data || [];
      const allTargets = targetsRes.data || [];
      const allVisits = visitsRes.data || [];
      
      console.log('🔐 Before filtering:', { 
        salesmen: allSalesmen.length, 
        targets: allTargets.length, 
        visits: allVisits.length,
        hasAccessToAll: hasAccessToAllPlants(),
        assignedPlants: user?.assigned_plants
      });
      
      const salesmen = filterByPlantAccess(allSalesmen, 'plant');
      const targets = filterByPlantAccess(allTargets, 'plant');
      const visits = filterByPlantAccess(allVisits, 'plant');

      console.log('🔐 After filtering:', { 
        salesmen: salesmen.length, 
        targets: targets.length, 
        visits: visits.length 
      });

      // If no data, show empty state
      if (salesmen.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Simple calculation without date filtering
      const perfData = salesmen.map((salesman: any) => {
        const target = targets.find((t: any) => t.salesman_id === salesman.id);
        const salesmanVisits = visits.filter((v: any) => v.salesman_id === salesman.id);
        
        const actualVisits = salesmanVisits.length;
        const actualOrders = salesmanVisits.filter((v: any) => 
          Array.isArray(v.meeting_type) ? v.meeting_type.includes('order') : v.meeting_type === 'order'
        ).length;
        const actualOrderValue = salesmanVisits.reduce((sum: number, v: any) => sum + (parseFloat(v.order_value) || 0), 0);

        const targetVisits = target?.visits_per_month || 0;
        const targetOrders = target?.orders_per_month || 0;
        const targetOrderValue = target?.order_value_per_month || 0;

        return {
          salesman_name: salesman.name,
          salesman_name_ar: salesman.name_ar,
          target_visits: targetVisits,
          actual_visits: actualVisits,
          target_orders: targetOrders,
          actual_orders: actualOrders,
          target_order_value: targetOrderValue,
          actual_order_value: actualOrderValue,
          visits_achievement: targetVisits > 0 ? Math.round((actualVisits / targetVisits) * 100) : 0,
          orders_achievement: targetOrders > 0 ? Math.round((actualOrders / targetOrders) * 100) : 0,
          order_value_achievement: targetOrderValue > 0 ? Math.round((actualOrderValue / targetOrderValue) * 100) : 0,
        };
      });

      perfData.sort((a: any, b: any) => b.visits_achievement - a.visits_achievement);
      
      console.log('Dashboard data processed, setting state');
      setData(perfData);
      setLoading(false);
    } catch (err: any) {
      console.error('❌ Dashboard error:', err);
      setError(err.message || 'Failed to load data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={4}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('loadingData')}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box p={3}>
        <Alert severity="info">
          <Typography variant="body2" gutterBottom><strong>{t('noData')}</strong></Typography>
          <Typography variant="body2">
            {t('dashboardReady')}
          </Typography>
        </Alert>
      </Box>
    );
  }

  const totals = data.reduce(
    (acc, row) => ({
      visits: acc.visits + Number(row.actual_visits),
      orders: acc.orders + Number(row.actual_orders),
      orderValue: acc.orderValue + Number(row.actual_order_value),
      targetVisits: acc.targetVisits + Number(row.target_visits),
      targetOrders: acc.targetOrders + Number(row.target_orders),
      targetOrderValue: acc.targetOrderValue + Number(row.target_order_value),
    }),
    { visits: 0, orders: 0, orderValue: 0, targetVisits: 0, targetOrders: 0, targetOrderValue: 0 }
  );

  const overallAchievement = {
    visits: totals.targetVisits > 0 ? Math.round((totals.visits / totals.targetVisits) * 100) : 0,
    orders: totals.targetOrders > 0 ? Math.round((totals.orders / totals.targetOrders) * 100) : 0,
    orderValue: totals.targetOrderValue > 0 ? Math.round((totals.orderValue / totals.targetOrderValue) * 100) : 0,
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          📊 {t('salesPerformanceDashboard')}
        </Typography>
        <Chip 
          label={`${data.length} ${t('salesmen')}`} 
          color="primary" 
          variant="outlined"
        />
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        {[
          { 
            label: t('totalVisitsCount'), 
            value: totals.visits, 
            target: totals.targetVisits, 
            achievement: overallAchievement.visits,
            color: '#667eea',
            icon: '🏃'
          },
          { 
            label: t('totalOrders'), 
            value: totals.orders, 
            target: totals.targetOrders, 
            achievement: overallAchievement.orders,
            color: '#43e97b',
            icon: '📦'
          },
          { 
            label: t('orderValue'), 
            value: `${tenant?.currencySymbol || '$'}${(totals.orderValue / 1000).toFixed(0)}K`, 
            target: `${tenant?.currencySymbol || '$'}${(totals.targetOrderValue / 1000).toFixed(0)}K`, 
            achievement: overallAchievement.orderValue,
            color: '#fa709a',
            icon: '💰'
          },
          { 
            label: t('avgPerSalesman'), 
            value: Math.round(totals.visits / data.length), 
            target: Math.round(totals.targetVisits / data.length), 
            achievement: overallAchievement.visits,
            color: '#4facfe',
            icon: '📈'
          },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${stat.color}15, ${stat.color}05)` }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    {stat.label}
                  </Typography>
                  <Typography variant="h4">{stat.icon}</Typography>
                </Box>
                <Typography variant="h4" fontWeight={700} color={stat.color} my={1}>
                  {stat.value}
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    {t('target')}: {stat.target}
                  </Typography>
                  <Chip 
                    label={`${stat.achievement}%`} 
                    size="small"
                    sx={{ 
                      bgcolor: stat.achievement >= 100 ? '#43e97b' : stat.achievement >= 75 ? '#4facfe' : '#ff6b6b',
                      color: 'white',
                      fontWeight: 600
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Performance Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {t('individualSalesmanPerformance')}
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '14px', textAlign: 'left', fontWeight: 600 }}>{t('salesman')}</th>
                  <th style={{ padding: '14px', textAlign: 'center', fontWeight: 600 }}>{t('visits')}</th>
                  <th style={{ padding: '14px', textAlign: 'center', fontWeight: 600 }}>{t('orders')}</th>
                  <th style={{ padding: '14px', textAlign: 'center', fontWeight: 600 }}>{t('orderValue')}</th>
                  <th style={{ padding: '14px', textAlign: 'center', fontWeight: 600 }}>{t('hitRatio')}</th>
                  <th style={{ padding: '14px', textAlign: 'center', fontWeight: 600 }}>{t('overall')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const hitRatio = row.actual_visits > 0 ? Math.round((row.actual_orders / row.actual_visits) * 100) : 0;
                  const avgAchievement = Math.round((row.visits_achievement + row.orders_achievement + row.order_value_achievement) / 3);
                  
                  return (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                      }}
                    >
                      <td style={{ padding: '14px', fontWeight: 600 }}>
                        {getBilingualDisplay(row.salesman_name, row.salesman_name_ar, i18n.language === 'ar')}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 600 }}>{row.actual_visits} / {row.target_visits}</div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: row.visits_achievement >= 100 ? '#43e97b' : row.visits_achievement >= 75 ? '#4facfe' : '#ff6b6b',
                          fontWeight: 600
                        }}>
                          {row.visits_achievement}%
                        </div>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 600 }}>{row.actual_orders} / {row.target_orders}</div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: row.orders_achievement >= 100 ? '#43e97b' : row.orders_achievement >= 75 ? '#4facfe' : '#ff6b6b',
                          fontWeight: 600
                        }}>
                          {row.orders_achievement}%
                        </div>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 600 }}>
                          {tenant?.currencySymbol || '$'}{(Number(row.actual_order_value) / 1000).toFixed(0)}K / {tenant?.currencySymbol || '$'}{(Number(row.target_order_value) / 1000).toFixed(0)}K
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: row.order_value_achievement >= 100 ? '#43e97b' : row.order_value_achievement >= 75 ? '#4facfe' : '#ff6b6b',
                          fontWeight: 600
                        }}>
                          {row.order_value_achievement}%
                        </div>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <Chip 
                          label={`${hitRatio}%`}
                          size="small"
                          sx={{ 
                            bgcolor: hitRatio >= 30 ? '#43e97b' : hitRatio >= 20 ? '#4facfe' : '#ff6b6b',
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <Chip
                          label={avgAchievement >= 100 ? `✓ ${t('excellent')}` : avgAchievement >= 75 ? t('good') : t('belowTarget')}
                          size="small"
                          sx={{
                            bgcolor: avgAchievement >= 100 ? '#43e97b' : avgAchievement >= 75 ? '#4facfe' : '#ff6b6b',
                            color: 'white',
                            fontWeight: 600,
                            minWidth: '100px'
                          }}
                        />
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                          {avgAchievement}% {t('avg')}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
