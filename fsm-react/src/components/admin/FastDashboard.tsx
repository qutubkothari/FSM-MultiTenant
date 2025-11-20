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
import { useTranslation } from 'react-i18next';

interface PerformanceData {
  salesman_name: string;
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
  const { t } = useTranslation();
  const [data, setData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

      // Fetch all data in parallel for speed
      const [salesmenRes, targetsRes, visitsRes] = await Promise.all([
        supabase.from('salesmen').select('id, name').eq('is_admin', false),
        supabase.from('salesman_targets').select('*').eq('month', currentMonth).eq('year', currentYear),
        supabase.from('visits').select('salesman_id, meeting_type, order_value').gte('created_at', startOfMonth).lte('created_at', endOfMonth)
      ]);

      if (salesmenRes.error) throw salesmenRes.error;
      if (targetsRes.error) throw targetsRes.error;
      if (visitsRes.error) throw visitsRes.error;

      const salesmen = salesmenRes.data || [];
      const targets = targetsRes.data || [];
      const visits = visitsRes.data || [];

      // Calculate performance data
      const perfData = salesmen.map((salesman: any) => {
        const target = targets.find((t: any) => t.salesman_id === salesman.id) || {};
        const salesmanVisits = visits.filter((v: any) => v.salesman_id === salesman.id);
        
        const actualVisits = salesmanVisits.length;
        const actualOrders = salesmanVisits.filter((v: any) => v.meeting_type?.includes('Order')).length;
        const actualOrderValue = salesmanVisits
          .filter((v: any) => v.meeting_type?.includes('Order'))
          .reduce((sum: number, v: any) => sum + (v.order_value || 0), 0);

        const targetVisits = target.visits_per_month || 0;
        const targetOrders = target.orders_per_month || 0;
        const targetOrderValue = target.order_value_per_month || 0;

        return {
          salesman_name: salesman.name,
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
      setData(perfData);
    } catch (err: any) {
      console.error('❌ Dashboard error:', err);
      setError(err.message || 'Failed to load data');
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom><strong>Setup Required:</strong></Typography>
          <Typography variant="body2">
            1. Go to Supabase SQL Editor<br/>
            2. Run: database/create-indexes.sql<br/>
            3. Run: database/create-performance-view.sql<br/>
            4. Refresh this page
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
          📊 {t('salesPerformanceDashboard')} - November 2025
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
            value: `₹${(totals.orderValue / 1000).toFixed(0)}K`, 
            target: `₹${(totals.targetOrderValue / 1000).toFixed(0)}K`, 
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
                        {row.salesman_name}
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
                          ₹{(Number(row.actual_order_value) / 1000).toFixed(0)}K / ₹{(Number(row.target_order_value) / 1000).toFixed(0)}K
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
