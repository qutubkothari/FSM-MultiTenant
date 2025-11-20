import { useState, useEffect, useMemo } from 'react';
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
  CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
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

const getMonthName = (m: number) => {
  return new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' });
};

const getAchievementColor = (achievement: number) => {
  if (achievement >= 100) return '#43e97b';
  if (achievement >= 75) return '#4facfe';
  if (achievement >= 50) return '#fa709a';
  return '#ff6b6b';
};

export default function TargetsDashboard() {
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [showAllSalesmen, setShowAllSalesmen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [overallStats, setOverallStats] = useState({
    total_target_visits: 0,
    total_actual_visits: 0,
    total_target_orders: 0,
    total_actual_orders: 0,
    avg_achievement: 0,
  });

  useEffect(() => {
    loadData();
    setInitialLoad(false);
  }, [month, year]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadData(true); // Silent refresh
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [month, year, autoRefresh]);

  const loadData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    
    try {
      const [targets, allVisits, salesmen] = await Promise.all([
        targetsService.getTargets(undefined, month, year).catch((err) => {
          console.error('Error fetching targets:', err);
          return [];
        }),
        visitService.getVisits(),
        salesmanService.getSalesmen(),
      ]);

      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(new Date(year, month - 1));

      const filteredVisits = allVisits.filter((v: any) => {
        const visitDate = new Date(v.created_at);
        return visitDate >= monthStart && visitDate <= monthEnd;
      });

      const performance: PerformanceData[] = salesmen
        .filter((s: any) => !s.is_admin)
        .map((salesman: any) => {
          const target = targets.find((t: any) => t.salesman_id === salesman.id);
          const salesmanVisits = filteredVisits.filter((v: any) => v.salesman_id === salesman.id);

          const orderVisits = salesmanVisits.filter((v: any) =>
            Array.isArray(v.meeting_type)
              ? v.meeting_type.includes('Order')
              : v.meeting_type === 'Order'
          );

          const actualOrders = orderVisits.length;
          const actualOrderValue = orderVisits.reduce((sum: number, v: any) => sum + (v.order_value || 0), 0);
          const targetVisits = target?.visits_per_month || 0;
          const targetOrders = target?.orders_per_month || 0;
          const targetOrderValue = target?.order_value_per_month || 0;

          const visitsAchievement = targetVisits > 0 ? (salesmanVisits.length / targetVisits) * 100 : 0;
          const ordersAchievement = targetOrders > 0 ? (actualOrders / targetOrders) * 100 : 0;
          const orderValueAchievement = targetOrderValue > 0 ? (actualOrderValue / targetOrderValue) * 100 : 0;

          return {
            salesman_name: salesman.name,
            target_visits: targetVisits,
            actual_visits: salesmanVisits.length,
            target_orders: targetOrders,
            actual_orders: actualOrders,
            target_order_value: targetOrderValue,
            actual_order_value: actualOrderValue,
            visits_achievement: Math.round(visitsAchievement),
            orders_achievement: Math.round(ordersAchievement),
            order_value_achievement: Math.round(orderValueAchievement),
          };
        });

      setPerformanceData(performance);

      const totalTargetVisits = performance.reduce((sum, p) => sum + p.target_visits, 0);
      const totalActualVisits = performance.reduce((sum, p) => sum + p.actual_visits, 0);
      const totalTargetOrders = performance.reduce((sum, p) => sum + p.target_orders, 0);
      const totalActualOrders = performance.reduce((sum, p) => sum + p.actual_orders, 0);
      const avgAchievement = performance.length > 0
        ? performance.reduce((sum, p) => sum + p.visits_achievement, 0) / performance.length
        : 0;

      setOverallStats({
        total_target_visits: totalTargetVisits,
        total_actual_visits: totalActualVisits,
        total_target_orders: totalTargetOrders,
        total_actual_orders: totalActualOrders,
        avg_achievement: Math.round(avgAchievement),
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      if (!silent) {
        setError('Failed to load performance data. Please ensure the targets table exists in the database.');
      }
    }

    setLoading(false);
  };

  const handleExport = () => {
    const exportData = performanceData.map((p) => ({
      Salesman: p.salesman_name,
      'Target Visits': p.target_visits,
      'Actual Visits': p.actual_visits,
      'Visits Achievement %': p.visits_achievement,
      'Target Orders': p.target_orders,
      'Actual Orders': p.actual_orders,
      'Orders Achievement %': p.orders_achievement,
      'Target Order Value (₹)': p.target_order_value,
      'Actual Order Value (₹)': p.actual_order_value,
      'Order Value Achievement %': p.order_value_achievement,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Performance');

    const fileName = `Performance_Report_${format(new Date(year, month - 1), 'MMM_yyyy')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const showEmptyState = !initialLoad && !loading && performanceData.length === 0;
  
  // Limit to top 10 by default, show all if user clicks
  const displayData = useMemo(() => {
    if (showAllSalesmen) return performanceData;
    return performanceData.slice(0, 10);
  }, [performanceData, showAllSalesmen]);

  const chartData = useMemo(() => {
    return displayData
      .slice()
      .sort((a, b) => b.visits_achievement - a.visits_achievement)
      .slice(0, 12);
  }, [displayData]);

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Alert severity="info">
          <Typography variant="body2" gutterBottom>
            <strong>To activate the Performance Dashboard:</strong>
          </Typography>
          <Typography variant="body2" component="div">
            1. Go to your Supabase dashboard<br />
            2. Navigate to SQL Editor<br />
            3. Run the SQL file: <code>database/create-targets-table.sql</code><br />
            4. Refresh this page
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          📊 Sales Performance Dashboard
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <Chip 
            label={autoRefresh ? '🔄 Auto-refresh ON' : 'Auto-refresh OFF'} 
            color={autoRefresh ? 'success' : 'default'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            sx={{ cursor: 'pointer' }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Month</InputLabel>
            <Select value={month} label="Month" onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <MenuItem key={m} value={m}>
                  {getMonthName(m)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select value={year} label="Year" onChange={(e) => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026].map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button startIcon={<DownloadIcon />} variant="contained" onClick={handleExport} disabled={!performanceData.length}>
            Export
          </Button>
          <Button
            variant="outlined"
            onClick={() => loadData()}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={20} /> : '🔄 Refresh'}
          </Button>
        </Box>
      </Box>

      {showEmptyState && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No targets set for {getMonthName(month)} {year}. Go to Targets tab to set targets.
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Target Visits</Typography>
              <Typography variant="h4" fontWeight={700}>
                {initialLoad ? <CircularProgress size={24} sx={{ color: 'white' }} /> : overallStats.total_target_visits}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Actual Visits</Typography>
              <Typography variant="h4" fontWeight={700}>
                {initialLoad ? <CircularProgress size={24} sx={{ color: 'white' }} /> : overallStats.total_actual_visits}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Target Orders</Typography>
              <Typography variant="h4" fontWeight={700}>
                {initialLoad ? <CircularProgress size={24} sx={{ color: 'white' }} /> : overallStats.total_target_orders}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Actual Orders</Typography>
              <Typography variant="h4" fontWeight={700}>
                {initialLoad ? <CircularProgress size={24} sx={{ color: 'white' }} /> : overallStats.total_actual_orders}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Visits: Target vs Actual
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
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
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Orders: Target vs Actual
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
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
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Order Value: Target vs Actual (₹)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="salesman_name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="target_order_value" fill="#43e97b" name="Target Value" />
                  <Bar dataKey="actual_order_value" fill="#fa709a" name="Actual Value" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Visits Achievement Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="visits_achievement"
                    nameKey="salesman_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.salesman_name}: ${entry.visits_achievement}%`}
                  >
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Achievement Percentage Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
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

      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={600}>
              Detailed Performance by Salesman
            </Typography>
            {performanceData.length > 10 && (
              <Button 
                size="small" 
                onClick={() => setShowAllSalesmen(!showAllSalesmen)}
                variant="outlined"
              >
                {showAllSalesmen ? `Show Top 10` : `Show All (${performanceData.length})`}
              </Button>
            )}
          </Box>
          <Box sx={{ mt: 2 }}>
            {displayData.map((data, index) => (
              <Box key={`${data.salesman_name}-${index}`} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {data.salesman_name}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">Visits</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {data.actual_visits} / {data.target_visits}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(data.visits_achievement, 100)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getAchievementColor(data.visits_achievement),
                          },
                        }}
                      />
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Achievement: {data.visits_achievement}%
                        </Typography>
                        {data.visits_achievement >= 100 ? (
                          <Chip icon={<TrendingUpIcon />} label="Target Met" size="small" color="success" />
                        ) : (
                          <Chip icon={<TrendingDownIcon />} label="Below Target" size="small" color="warning" />
                        )}
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">Orders</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {data.actual_orders} / {data.target_orders}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(data.orders_achievement, 100)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getAchievementColor(data.orders_achievement),
                          },
                        }}
                      />
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Achievement: {data.orders_achievement}%
                        </Typography>
                        {data.orders_achievement >= 100 ? (
                          <Chip icon={<TrendingUpIcon />} label="Target Met" size="small" color="success" />
                        ) : (
                          <Chip icon={<TrendingDownIcon />} label="Below Target" size="small" color="warning" />
                        )}
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">Order Value</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          ₹{data.actual_order_value.toLocaleString()} / ₹{data.target_order_value.toLocaleString()}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(data.order_value_achievement, 100)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getAchievementColor(data.order_value_achievement),
                          },
                        }}
                      />
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                        <Typography variant="caption" color="text.secondary">
                          Achievement: {data.order_value_achievement}%
                        </Typography>
                        {data.order_value_achievement >= 100 ? (
                          <Chip icon={<TrendingUpIcon />} label="Target Met" size="small" color="success" />
                        ) : (
                          <Chip icon={<TrendingDownIcon />} label="Below Target" size="small" color="warning" />
                        )}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
