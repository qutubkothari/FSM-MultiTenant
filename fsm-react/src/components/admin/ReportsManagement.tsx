import { useEffect, useState } from 'react';
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
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Divider,
  Button,
  Alert,
  LinearProgress,
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
} from 'recharts';
import { visitService, salesmanService, productService, targetsService } from '../../services/supabase';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';

interface SalesmanStats {
  salesman_id: string;
  salesman_name: string;
  total_visits: number;
  daily_average: number;
  weekly_visits: number;
  orders: number;
  enquiries: number;
  followups: number;
  hit_ratio: number;
  // Targets
  target_visits?: number;
  target_orders?: number;
  target_new_visits?: number;
  target_repeat_visits?: number;
  // Achievement %
  visits_achievement?: number;
  orders_achievement?: number;
}

interface CustomerStats {
  customer_name: string;
  visit_count: number;
  last_visit: string;
  total_orders: number;
}

interface ProductStats {
  product_id: string;
  product_name: string;
  discussion_count: number;
  percentage: number;
}

export default function ReportsManagement() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');
  
  const [salesmanStats, setSalesmanStats] = useState<SalesmanStats[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerStats[]>([]);
  const [productStats, setProductStats] = useState<ProductStats[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    total_visits: 0,
    total_orders: 0,
    total_enquiries: 0,
    total_followups: 0,
    avg_visits_per_day: 0,
    overall_hit_ratio: 0,
  });

  const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#30cfd0'];

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const [allVisits, allSalesmen, allProducts, monthlyTargets] = await Promise.all([
        visitService.getVisits(),
        salesmanService.getSalesmen(),
        productService.getProducts(),
        targetsService.getTargets(undefined, currentMonth, currentYear),
      ]);

      setTargets(monthlyTargets);

      // Filter visits by date range
      const filteredVisits = filterVisitsByDateRange(allVisits);
      
      // Calculate all stats with targets
      calculateSalesmanStats(filteredVisits, allSalesmen, monthlyTargets);
      calculateCustomerStats(filteredVisits);
      calculateProductStats(filteredVisits, allProducts);
      calculateSummaryStats(filteredVisits);
    } catch (error) {
      console.error('Error loading report data:', error);
    }
    setLoading(false);
  };

  const filterVisitsByDateRange = (allVisits: any[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return allVisits.filter((visit) => {
      const visitDate = new Date(visit.created_at);
      
      switch (dateRange) {
        case 'today':
          return visitDate >= today;
        case 'week':
          return visitDate >= startOfWeek(now) && visitDate <= endOfWeek(now);
        case 'month':
          return visitDate >= startOfMonth(now) && visitDate <= endOfMonth(now);
        case 'all':
        default:
          return true;
      }
    });
  };

  const calculateSalesmanStats = (filteredVisits: any[], allSalesmen: any[]) => {
    const stats: SalesmanStats[] = allSalesmen.map((salesman) => {
      const salesmanVisits = filteredVisits.filter(
        (v) => v.salesman_id === salesman.id
      );

      const orders = salesmanVisits.filter((v) =>
        Array.isArray(v.meeting_type) 
          ? v.meeting_type.includes('Order')
          : v.meeting_type === 'Order'
      ).length;

      const enquiries = salesmanVisits.filter((v) =>
        Array.isArray(v.meeting_type)
          ? v.meeting_type.includes('Enquiry')
          : v.meeting_type === 'Enquiry'
      ).length;

      const followups = salesmanVisits.filter((v) =>
        Array.isArray(v.meeting_type)
          ? v.meeting_type.includes('Follow-up')
          : v.meeting_type === 'Follow-up'
      ).length;

      // Calculate days in range
      const daysInRange = dateRange === 'today' ? 1 : 
                          dateRange === 'week' ? 7 : 
                          dateRange === 'month' ? 30 : 
                          365;

      const daily_average = salesmanVisits.length / daysInRange;
      const hit_ratio = salesmanVisits.length > 0 
        ? (orders / salesmanVisits.length) * 100 
        : 0;

      return {
        salesman_id: salesman.id,
        salesman_name: salesman.name,
        total_visits: salesmanVisits.length,
        daily_average: Math.round(daily_average * 10) / 10,
        weekly_visits: dateRange === 'week' ? salesmanVisits.length : 0,
        orders,
        enquiries,
        followups,
        hit_ratio: Math.round(hit_ratio * 10) / 10,
      };
    });

    setSalesmanStats(stats.sort((a, b) => b.total_visits - a.total_visits));
  };

  const calculateCustomerStats = (filteredVisits: any[]) => {
    const customerMap = new Map<string, CustomerStats>();

    filteredVisits.forEach((visit) => {
      const name = visit.customer_name;
      if (!customerMap.has(name)) {
        customerMap.set(name, {
          customer_name: name,
          visit_count: 0,
          last_visit: visit.created_at,
          total_orders: 0,
        });
      }

      const stats = customerMap.get(name)!;
      stats.visit_count++;
      
      if (new Date(visit.created_at) > new Date(stats.last_visit)) {
        stats.last_visit = visit.created_at;
      }

      if (Array.isArray(visit.meeting_type) 
          ? visit.meeting_type.includes('Order')
          : visit.meeting_type === 'Order') {
        stats.total_orders++;
      }
    });

    const stats = Array.from(customerMap.values())
      .sort((a, b) => b.visit_count - a.visit_count)
      .slice(0, 20); // Top 20 customers

    setCustomerStats(stats);
  };

  const calculateProductStats = (filteredVisits: any[], allProducts: any[]) => {
    const productMap = new Map<string, number>();

    filteredVisits.forEach((visit) => {
      if (visit.products_discussed && Array.isArray(visit.products_discussed)) {
        visit.products_discussed.forEach((productId: string) => {
          productMap.set(productId, (productMap.get(productId) || 0) + 1);
        });
      }
    });

    const total = Array.from(productMap.values()).reduce((sum, count) => sum + count, 0);

    const stats: ProductStats[] = Array.from(productMap.entries())
      .map(([productId, count]) => {
        const product = allProducts.find((p) => p.id === productId);
        return {
          product_id: productId,
          product_name: product?.name || 'Unknown Product',
          discussion_count: count,
          percentage: Math.round((count / total) * 100 * 10) / 10,
        };
      })
      .sort((a, b) => b.discussion_count - a.discussion_count)
      .slice(0, 15); // Top 15 products

    setProductStats(stats);
  };

  const calculateSummaryStats = (filteredVisits: any[]) => {
    const orders = filteredVisits.filter((v) =>
      Array.isArray(v.meeting_type)
        ? v.meeting_type.includes('Order')
        : v.meeting_type === 'Order'
    ).length;

    const enquiries = filteredVisits.filter((v) =>
      Array.isArray(v.meeting_type)
        ? v.meeting_type.includes('Enquiry')
        : v.meeting_type === 'Enquiry'
    ).length;

    const followups = filteredVisits.filter((v) =>
      Array.isArray(v.meeting_type)
        ? v.meeting_type.includes('Follow-up')
        : v.meeting_type === 'Follow-up'
    ).length;

    const daysInRange = dateRange === 'today' ? 1 :
                        dateRange === 'week' ? 7 :
                        dateRange === 'month' ? 30 :
                        365;

    const avg_visits_per_day = filteredVisits.length / daysInRange;
    const overall_hit_ratio = filteredVisits.length > 0
      ? (orders / filteredVisits.length) * 100
      : 0;

    setSummaryStats({
      total_visits: filteredVisits.length,
      total_orders: orders,
      total_enquiries: enquiries,
      total_followups: followups,
      avg_visits_per_day: Math.round(avg_visits_per_day * 10) / 10,
      overall_hit_ratio: Math.round(overall_hit_ratio * 10) / 10,
    });
  };

  const handleExportReport = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Hylite FSM - Sales Report'],
      ['Date Range:', dateRange.toUpperCase()],
      ['Generated On:', format(new Date(), 'MMM dd, yyyy HH:mm')],
      [],
      ['Summary Statistics'],
      ['Total Visits', summaryStats.total_visits],
      ['Total Orders', summaryStats.total_orders],
      ['Total Enquiries', summaryStats.total_enquiries],
      ['Total Follow-ups', summaryStats.total_followups],
      ['Avg Visits/Day', summaryStats.avg_visits_per_day],
      ['Overall Hit Ratio', `${summaryStats.overall_hit_ratio}%`],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Salesman Performance Sheet
    const salesmanData: any[][] = [
      ['Salesman', 'Total Visits', 'Daily Avg', 'Orders', 'Enquiries', 'Follow-ups', 'Hit Ratio %']
    ];
    salesmanStats.forEach((s) => {
      salesmanData.push([
        s.salesman_name,
        s.total_visits,
        s.daily_average,
        s.orders,
        s.enquiries,
        s.followups,
        s.hit_ratio,
      ]);
    });
    const salesmanSheet = XLSX.utils.aoa_to_sheet(salesmanData);
    XLSX.utils.book_append_sheet(wb, salesmanSheet, 'Salesman Performance');

    // Top Customers Sheet
    const customerData: any[][] = [
      ['Customer Name', 'Visit Count', 'Total Orders', 'Last Visit']
    ];
    customerStats.forEach((c) => {
      customerData.push([
        c.customer_name,
        c.visit_count,
        c.total_orders,
        format(new Date(c.last_visit), 'MMM dd, yyyy'),
      ]);
    });
    const customerSheet = XLSX.utils.aoa_to_sheet(customerData);
    XLSX.utils.book_append_sheet(wb, customerSheet, 'Top Customers');

    // Product Performance Sheet
    const productData: any[][] = [
      ['Product Name', 'Discussion Count', 'Percentage']
    ];
    productStats.forEach((p) => {
      productData.push([p.product_name, p.discussion_count, `${p.percentage}%`]);
    });
    const productSheet = XLSX.utils.aoa_to_sheet(productData);
    XLSX.utils.book_append_sheet(wb, productSheet, 'Product Performance');

    // Download
    const fileName = `Hylite_FSM_Report_${dateRange}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          Sales Reports & Analytics
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRange}
              label="Date Range"
              onChange={(e) => setDateRange(e.target.value as any)}
            >
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="all">All Time</MenuItem>
            </Select>
          </FormControl>
          <Button
            startIcon={<DownloadIcon />}
            variant="contained"
            onClick={handleExportReport}
          >
            Export Report
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Total Visits
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {summaryStats.total_visits}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Orders
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {summaryStats.total_orders}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Enquiries
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {summaryStats.total_enquiries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Follow-ups
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {summaryStats.total_followups}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Avg/Day
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {summaryStats.avg_visits_per_day}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Hit Ratio
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {summaryStats.overall_hit_ratio}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Salesman Performance Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            📊 Salesman Performance
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Salesman</strong></TableCell>
                  <TableCell align="right"><strong>Total Visits</strong></TableCell>
                  <TableCell align="right"><strong>Daily Avg</strong></TableCell>
                  <TableCell align="right"><strong>Orders</strong></TableCell>
                  <TableCell align="right"><strong>Enquiries</strong></TableCell>
                  <TableCell align="right"><strong>Follow-ups</strong></TableCell>
                  <TableCell align="right"><strong>Hit Ratio</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salesmanStats.map((stat) => (
                  <TableRow key={stat.salesman_id} hover>
                    <TableCell>{stat.salesman_name}</TableCell>
                    <TableCell align="right">
                      <Chip label={stat.total_visits} size="small" color="primary" />
                    </TableCell>
                    <TableCell align="right">{stat.daily_average}</TableCell>
                    <TableCell align="right">
                      <Chip label={stat.orders} size="small" color="success" />
                    </TableCell>
                    <TableCell align="right">{stat.enquiries}</TableCell>
                    <TableCell align="right">{stat.followups}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={`${stat.hit_ratio}%`} 
                        size="small" 
                        color={stat.hit_ratio >= 20 ? 'success' : stat.hit_ratio >= 10 ? 'warning' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Top Customers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                👥 Most Visited Customers
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Customer</strong></TableCell>
                      <TableCell align="right"><strong>Visits</strong></TableCell>
                      <TableCell align="right"><strong>Orders</strong></TableCell>
                      <TableCell align="right"><strong>Last Visit</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerStats.slice(0, 10).map((stat, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{stat.customer_name}</TableCell>
                        <TableCell align="right">
                          <Chip label={stat.visit_count} size="small" color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">{stat.total_orders}</TableCell>
                        <TableCell align="right">
                          <Typography variant="caption">
                            {format(new Date(stat.last_visit), 'MMM dd')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Products */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                🛍️ Most Discussed Products
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Product</strong></TableCell>
                      <TableCell align="right"><strong>Discussions</strong></TableCell>
                      <TableCell align="right"><strong>Share %</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productStats.slice(0, 10).map((stat, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{stat.product_name}</TableCell>
                        <TableCell align="right">
                          <Chip label={stat.discussion_count} size="small" color="success" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600} color="primary">
                            {stat.percentage}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
