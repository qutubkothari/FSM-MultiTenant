import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  LinearProgress,
  Chip,
  Alert,
  Skeleton,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { targetsService, visitService, salesmanService } from '../../services/supabase';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';

const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#30cfd0', '#ff6b6b', '#4ecdc4'];

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

const getMonthName = (m: number) => new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' });

const getAchievementColor = (achievement: number) => {
  if (achievement >= 100) return '#43e97b';
  if (achievement >= 75) return '#4facfe';
  if (achievement >= 50) return '#fa709a';
  return '#ff6b6b';
};

export default function PerformanceDashboard() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  
  // Separate loading states for progressive loading
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingPerformance, setLoadingPerformance] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [stats, setStats] = useState({ visits: 0, orders: 0, targetVisits: 0, targetOrders: 0 });
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Load quick stats first (much faster query)
  const loadQuickStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [targets, visits] = await Promise.all([
        targetsService.getTargets(undefined, month, year).catch((err) => {
          console.error('Error fetching targets:', err);
          return [];
        }),
        visitService.getVisits().catch((err) => {
          console.error('Error fetching visits:', err);
          return [];
        }),
      ]);

      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(new Date(year, month - 1));
      const monthVisits = visits.filter((v: any) => {
        const d = new Date(v.created_at);
        return d >= monthStart && d <= monthEnd;
      });

      const totalTargetVisits = targets.reduce((sum: number, t: any) => sum + (t.visits_per_month || 0), 0);
      const totalTargetOrders = targets.reduce((sum: number, t: any) => sum + (t.orders_per_month || 0), 0);
      const actualOrders = monthVisits.filter((v: any) => 
        Array.isArray(v.meeting_type) ? v.meeting_type.includes('Order') : v.meeting_type === 'Order'
      ).length;

      setStats({
        visits: monthVisits.length,
        orders: actualOrders,
        targetVisits: totalTargetVisits,
        targetOrders: totalTargetOrders,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Failed to load statistics. Please check your database connection.');
    }
    setLoadingStats(false);
  }, [month, year]);

  // Load detailed performance data (slower query)
  const loadPerformanceData = useCallback(async () => {
    setLoadingPerformance(true);
    setError(null);
    try {
      const [targets, allVisits, salesmen] = await Promise.all([
        targetsService.getTargets(undefined, month, year).catch((err) => {
          console.error('Error fetching targets:', err);
          return [];
        }),
        visitService.getVisits().catch((err) => {
          console.error('Error fetching visits:', err);
          return [];
        }),
        salesmanService.getSalesmen().catch((err) => {
          console.error('Error fetching salesmen:', err);
          return [];
        }),
      ]);

      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(new Date(year, month - 1));
      const filteredVisits = allVisits.filter((v: any) => {
        const d = new Date(v.created_at);
        return d >= monthStart && d <= monthEnd;
      });

      const performance: PerformanceData[] = salesmen
        .filter((s: any) => !s.is_admin)
        .map((salesman: any) => {
          const target = targets.find((t: any) => t.salesman_id === salesman.id);
          const salesmanVisits = filteredVisits.filter((v: any) => v.salesman_id === salesman.id);
          const orderVisits = salesmanVisits.filter((v: any) =>
            Array.isArray(v.meeting_type) ? v.meeting_type.includes('Order') : v.meeting_type === 'Order'
          );

          const actualOrders = orderVisits.length;
          const actualOrderValue = orderVisits.reduce((sum: number, v: any) => sum + (v.order_value || 0), 0);
          const targetVisits = target?.visits_per_month || 0;
          const targetOrders = target?.orders_per_month || 0;
          const targetOrderValue = target?.order_value_per_month || 0;

          return {
            salesman_name: salesman.name,
            target_visits: targetVisits,
            actual_visits: salesmanVisits.length,
            target_orders: targetOrders,
            actual_orders: actualOrders,
            target_order_value: targetOrderValue,
            actual_order_value: actualOrderValue,
            visits_achievement: targetVisits > 0 ? Math.round((salesmanVisits.length / targetVisits) * 100) : 0,
            orders_achievement: targetOrders > 0 ? Math.round((actualOrders / targetOrders) * 100) : 0,
            order_value_achievement: targetOrderValue > 0 ? Math.round((actualOrderValue / targetOrderValue) * 100) : 0,
          };
        })
        .sort((a, b) => b.visits_achievement - a.visits_achievement);

      setPerformanceData(performance);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading performance:', err);
      setError('Failed to load performance data');
    }
    setLoadingPerformance(false);
  }, [month, year]);

  // Initial load: stats first, then performance
  useEffect(() => {
    loadQuickStats();
    setTimeout(() => loadPerformanceData(), 100); // Small delay to prioritize stats
  }, [loadQuickStats, loadPerformanceData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadQuickStats();
      loadPerformanceData();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadQuickStats, loadPerformanceData]);

  const handleRefresh = () => {
    loadQuickStats();
    loadPerformanceData();
  };

  const handleExport = () => {
    const exportData = performanceData.map((p) => ({
      Salesman: p.salesman_name,
      'Target Visits': p.target_visits,
      'Actual Visits': p.actual_visits,
      'Visits %': p.visits_achievement,
      'Target Orders': p.target_orders,
      'Actual Orders': p.actual_orders,
      'Orders %': p.orders_achievement,
      'Target Value (₹)': p.target_order_value,
      'Actual Value (₹)': p.actual_order_value,
      'Value %': p.order_value_achievement,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Performance');
    XLSX.writeFile(wb, `Performance_${format(new Date(year, month - 1), 'MMM_yyyy')}.xlsx`);
  };

  const topPerformers = performanceData.slice(0, 10);

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={600}>📊 Performance Dashboard</Typography>
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <FormControlLabel
            control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
            label="Auto-refresh"
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Month</InputLabel>
            <Select value={month} label="Month" onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <MenuItem key={m} value={m}>{getMonthName(m)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select value={year} label="Year" onChange={(e) => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          <Button startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={loadingStats || loadingPerformance}>
            Refresh
          </Button>
          <Button startIcon={<DownloadIcon />} variant="contained" onClick={handleExport} disabled={!performanceData.length}>
            Export
          </Button>
        </Box>
      </Box>

      {/* Quick Stats Cards */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Target Visits', value: stats.targetVisits, color: '#667eea', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
          { label: 'Actual Visits', value: stats.visits, color: '#f093fb', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
          { label: 'Target Orders', value: stats.targetOrders, color: '#4facfe', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
          { label: 'Actual Orders', value: stats.orders, color: '#43e97b', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card sx={{ background: stat.gradient, color: 'white' }}>
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>{stat.label}</Typography>
                <Typography variant="h4" fontWeight={700}>
                  {loadingStats ? <Skeleton variant="text" width={60} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} /> : stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      {loadingPerformance ? (
        <Grid container spacing={3} mb={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Card><CardContent><Skeleton variant="rectangular" height={300} /></CardContent></Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>Visits: Target vs Actual</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topPerformers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="salesman_name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="target_visits" fill="#667eea" name="Target" />
                    <Bar dataKey="actual_visits" fill="#43e97b" name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>Orders: Target vs Actual</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topPerformers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="salesman_name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="target_orders" fill="#f093fb" name="Target" />
                    <Bar dataKey="actual_orders" fill="#4facfe" name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>Achievement Distribution</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topPerformers}
                      dataKey="visits_achievement"
                      nameKey="salesman_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.salesman_name}: ${entry.visits_achievement}%`}
                    >
                      {topPerformers.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>Achievement Trends</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={topPerformers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="salesman_name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="visits_achievement" stroke="#667eea" name="Visits %" strokeWidth={2} />
                    <Line type="monotone" dataKey="orders_achievement" stroke="#f093fb" name="Orders %" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Detailed Table - Collapsible */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={600}>Detailed Performance</Typography>
            <Button size="small" onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? 'Hide Details' : `Show Details (${performanceData.length})`}
            </Button>
          </Box>
          {showDetails && (
            <Box sx={{ mt: 2 }}>
              {performanceData.map((data, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>{data.salesman_name}</Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: 'Visits', actual: data.actual_visits, target: data.target_visits, achievement: data.visits_achievement },
                      { label: 'Orders', actual: data.actual_orders, target: data.target_orders, achievement: data.orders_achievement },
                      { label: 'Order Value', actual: `₹${data.actual_order_value.toLocaleString()}`, target: `₹${data.target_order_value.toLocaleString()}`, achievement: data.order_value_achievement },
                    ].map((metric, idx) => (
                      <Grid item xs={12} sm={4} key={idx}>
                        <Box>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">{metric.label}</Typography>
                            <Typography variant="body2" fontWeight={600}>{metric.actual} / {metric.target}</Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(metric.achievement, 100)}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              '& .MuiLinearProgress-bar': { backgroundColor: getAchievementColor(metric.achievement) },
                            }}
                          />
                          <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                            <Typography variant="caption" color="text.secondary">{metric.achievement}%</Typography>
                            <Chip
                              icon={metric.achievement >= 100 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                              label={metric.achievement >= 100 ? 'Met' : 'Below'}
                              size="small"
                              color={metric.achievement >= 100 ? 'success' : 'warning'}
                            />
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
