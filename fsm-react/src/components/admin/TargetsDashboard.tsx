import { useState, useEffect } from 'react';
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
  visits_achievement: number;
  orders_achievement: number;
}

export default function TargetsDashboard() {
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [overallStats, setOverallStats] = useState({
    total_target_visits: 0,
    total_actual_visits: 0,
    total_target_orders: 0,
    total_actual_orders: 0,
    avg_achievement: 0,
  });

  useEffect(() => {
    loadData();
  }, [month, year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [targets, allVisits, salesmen] = await Promise.all([
        targetsService.getTargets(undefined, month, year),
        visitService.getVisits(),
        salesmanService.getSalesmen(),
      ]);

      // Filter visits for the selected month/year
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(new Date(year, month - 1));

      const filteredVisits = allVisits.filter((v: any) => {
        const visitDate = new Date(v.created_at);
        return visitDate >= monthStart && visitDate <= monthEnd;
      });

      // Calculate performance for each salesman
      const performance: PerformanceData[] = salesmen
        .filter((s: any) => !s.is_admin)
        .map((salesman: any) => {
          const target = targets.find((t: any) => t.salesman_id === salesman.id);
          const salesmanVisits = filteredVisits.filter((v: any) => v.salesman_id === salesman.id);
          
          const actualOrders = salesmanVisits.filter((v: any) =>
            Array.isArray(v.meeting_type)
              ? v.meeting_type.includes('Order')
              : v.meeting_type === 'Order'
          ).length;

          const targetVisits = target?.visits_per_month || 0;
          const targetOrders = target?.orders_per_month || 0;
          const visitsAchievement = targetVisits > 0 ? (salesmanVisits.length / targetVisits) * 100 : 0;
          const ordersAchievement = targetOrders > 0 ? (actualOrders / targetOrders) * 100 : 0;

          return {
            salesman_name: salesman.name,
            target_visits: targetVisits,
            actual_visits: salesmanVisits.length,
            target_orders: targetOrders,
            actual_orders: actualOrders,
            visits_achievement: Math.round(visitsAchievement),
            orders_achievement: Math.round(ordersAchievement),
          };
        });

      setPerformanceData(performance);

      // Calculate overall stats
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
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
    setLoading(false);
  };

  const handleExport = () => {
    const exportData = performanceData.map((p) => ({
      'Salesman': p.salesman_name,
      'Target Visits': p.target_visits,
      'Actual Visits': p.actual_visits,
      'Visits Achievement %': p.visits_achievement,
      'Target Orders': p.target_orders,
      'Actual Orders': p.actual_orders,
      'Orders Achievement %': p.orders_achievement,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Performance');

    const fileName = `Performance_Report_${format(new Date(year, month - 1), 'MMM_yyyy')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getMonthName = (m: number) => {
    return new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' });
  };

  const getAchievementColor = (achievement: number) => {
    if (achievement >= 100) return '#43e97b';
    if (achievement >= 75) return '#4facfe';
    if (achievement >= 50) return '#fa709a';
    return '#ff6b6b';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography>Loading dashboard...</Typography>
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
          <Button startIcon={<DownloadIcon />} variant="contained" onClick={handleExport}>
            Export
          </Button>
        </Box>
      </Box>

      {performanceData.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No targets set for {getMonthName(month)} {year}. Go to Targets tab to set targets.
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Target Visits</Typography>
              <Typography variant="h4" fontWeight={700}>{overallStats.total_target_visits}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Actual Visits</Typography>
              <Typography variant="h4" fontWeight={700}>{overallStats.total_actual_visits}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Target Orders</Typography>
              <Typography variant="h4" fontWeight={700}>{overallStats.total_target_orders}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Actual Orders</Typography>
              <Typography variant="h4" fontWeight={700}>{overallStats.total_actual_orders}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} mb={3}>
        {/* Visits Performance Bar Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Visits: Target vs Actual
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
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

        {/* Orders Performance Bar Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Orders: Target vs Actual
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
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

        {/* Achievement Pie Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Visits Achievement Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={performanceData}
                    dataKey="visits_achievement"
                    nameKey="salesman_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(pieEntry) => `${pieEntry.salesman_name}: ${pieEntry.visits_achievement}%`}
                  >
                    {performanceData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Achievement Line Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Achievement Percentage Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
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

      {/* Detailed Performance Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Detailed Performance by Salesman
          </Typography>
          <Box sx={{ mt: 2 }}>
            {performanceData.map((data, index) => (
              <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
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
                          <Chip
                            icon={<TrendingUpIcon />}
                            label="Target Met"
                            size="small"
                            color="success"
                          />
                        ) : (
                          <Chip
                            icon={<TrendingDownIcon />}
                            label="Below Target"
                            size="small"
                            color="warning"
                          />
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
                          <Chip
                            icon={<TrendingUpIcon />}
                            label="Target Met"
                            size="small"
                            color="success"
                          />
                        ) : (
                          <Chip
                            icon={<TrendingDownIcon />}
                            label="Below Target"
                            size="small"
                            color="warning"
                          />
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
