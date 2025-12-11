import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
} from '@mui/material';
import {
  Download as DownloadIcon,
} from '@mui/icons-material';
import { supabase } from '../../services/supabase';
import { useTenantStore } from '../../store/tenantStore';
import { getBilingualDisplay } from '../../utils/arabicUtils';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { usePlantAccess } from '../../hooks/usePlantAccess';

interface SalesmanStats {
  salesman_id: string;
  salesman_name: string;
  salesman_name_ar?: string;
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
  customer_name_ar?: string;
  visit_count: number;
  last_visit: string;
  total_orders: number;
}

interface ProductStats {
  product_id: string;
  product_name: string;
  product_name_ar?: string;
  discussion_count: number;
  percentage: number;
}

export default function ReportsManagement() {
  const { t, i18n } = useTranslation();
  const { tenant } = useTenantStore();
  const { filterByPlantAccess } = usePlantAccess();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');
  
  const [salesmanStats, setSalesmanStats] = useState<SalesmanStats[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerStats[]>([]);
  const [productStats, setProductStats] = useState<ProductStats[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    total_visits: 0,
    total_orders: 0,
    total_enquiries: 0,
    total_followups: 0,
    avg_visits_per_day: 0,
    overall_hit_ratio: 0,
  });

  useEffect(() => {
    if (tenant?.id) {
      loadData();
    }
  }, [dateRange, tenant?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Calculate date range - optimized for speed
      let startDate = new Date();
      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = startOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          break;
        case 'all':
          startDate.setDate(startDate.getDate() - 30); // Only 30 days max for speed
          break;
      }

      // Parallel queries with minimal data and tenant filtering
      const tenantId = useTenantStore.getState().tenant?.id;
      if (!tenantId) {
        throw new Error('No tenant selected. Please select a company.');
      }
      
      // Query visits with deleted_at filter
      const visitsQuery = supabase
        .from('visits')
        .select('salesman_id, salesman_name, meeting_type, customer_name, customer_name_ar, products_discussed, created_at, plant')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      const [visitsResult, salesmenResult, productsResult, targetsResult] = await Promise.all([
        visitsQuery,
        supabase.from('salesmen').select('id, name, name_ar, plant').eq('is_admin', false).eq('tenant_id', tenantId).is('deleted_at', null),
        supabase.from('products').select('id, name, name_ar').eq('tenant_id', tenantId).is('deleted_at', null),
        supabase.from('salesman_targets').select('*').eq('month', currentMonth).eq('year', currentYear).eq('tenant_id', tenantId).is('deleted_at', null),
      ]);

      // Apply plant access filtering
      const allVisits = visitsResult.data || [];
      const allSalesmenRaw = salesmenResult.data || [];
      const allProducts = productsResult.data || [];
      const allTargetsRaw = targetsResult.data || [];
      
      const filteredVisits = filterByPlantAccess(allVisits, 'plant');
      const allSalesmen = filterByPlantAccess(allSalesmenRaw, 'plant');
      const monthlyTargets = filterByPlantAccess(allTargetsRaw, 'plant');
      
      // Log data for debugging
      console.log('Reports Data:', {
        visits: filteredVisits.length,
        salesmen: allSalesmen.length,
        products: allProducts.length,
        targets: monthlyTargets.length,
        sampleVisit: filteredVisits[0]
      });
      
      // Check for errors
      if (visitsResult.error) console.error('Visits error:', visitsResult.error);
      if (salesmenResult.error) console.error('Salesmen error:', salesmenResult.error);
      if (productsResult.error) console.error('Products error:', productsResult.error);
      if (targetsResult.error) console.error('Targets error:', targetsResult.error);
      
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

  const calculateSalesmanStats = (filteredVisits: any[], allSalesmen: any[], monthlyTargets: any[]) => {
    const stats: SalesmanStats[] = allSalesmen.map((salesman) => {
      const salesmanVisits = filteredVisits.filter(
        (v) => v.salesman_id === salesman.id
      );

      const orders = salesmanVisits.filter((v) =>
        Array.isArray(v.meeting_type) 
          ? v.meeting_type.some((t: string) => t.toLowerCase() === 'order')
          : v.meeting_type?.toLowerCase() === 'order'
      ).length;

      const enquiries = salesmanVisits.filter((v) =>
        Array.isArray(v.meeting_type)
          ? v.meeting_type.some((t: string) => t.toLowerCase() === 'enquiry')
          : v.meeting_type?.toLowerCase() === 'enquiry'
      ).length;

      const followups = salesmanVisits.filter((v) =>
        Array.isArray(v.meeting_type)
          ? v.meeting_type.some((t: string) => t.toLowerCase() === 'follow-up')
          : v.meeting_type?.toLowerCase() === 'follow-up'
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

      // Get targets for this salesman
      const salesmanTarget = monthlyTargets.find((t: any) => t.salesman_id === salesman.id);
      
      // Calculate achievements
      const target_visits = salesmanTarget?.visits_per_month || 0;
      const target_orders = salesmanTarget?.orders_per_month || 0;
      const visits_achievement = target_visits > 0 
        ? Math.round((salesmanVisits.length / target_visits) * 100) 
        : 0;
      const orders_achievement = target_orders > 0 
        ? Math.round((orders / target_orders) * 100) 
        : 0;

      return {
        salesman_id: salesman.id,
        salesman_name: salesman.name,
        salesman_name_ar: salesman.name_ar,
        total_visits: salesmanVisits.length,
        daily_average: Math.round(daily_average * 10) / 10,
        weekly_visits: dateRange === 'week' ? salesmanVisits.length : 0,
        orders,
        enquiries,
        followups,
        hit_ratio: Math.round(hit_ratio * 10) / 10,
        target_visits,
        target_orders,
        target_new_visits: salesmanTarget?.new_visits_per_month || 0,
        target_repeat_visits: salesmanTarget?.repeat_visits_per_month || 0,
        visits_achievement,
        orders_achievement,
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
          customer_name_ar: visit.customer_name_ar,
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
          ? visit.meeting_type.some((t: string) => t.toLowerCase() === 'order')
          : visit.meeting_type?.toLowerCase() === 'order') {
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
          product_name_ar: product?.name_ar,
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
        ? v.meeting_type.some((t: string) => t.toLowerCase() === 'order')
        : v.meeting_type?.toLowerCase() === 'order'
    ).length;

    const enquiries = filteredVisits.filter((v) =>
      Array.isArray(v.meeting_type)
        ? v.meeting_type.some((t: string) => t.toLowerCase() === 'enquiry')
        : v.meeting_type?.toLowerCase() === 'enquiry'
    ).length;

    const followups = filteredVisits.filter((v) =>
      Array.isArray(v.meeting_type)
        ? v.meeting_type.some((t: string) => t.toLowerCase() === 'follow-up')
        : v.meeting_type?.toLowerCase() === 'follow-up'
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
    setExporting(true);
    
    try {
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
        s.salesman_name, // English name only
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

    // Download - Fixed for Mac/Safari compatibility
    const fileName = `Hylite_FSM_Report_${dateRange}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    
    // Generate Excel file as array buffer
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // Create blob and trigger download (works on all browsers including Safari/Mac)
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
      alert('✅ Export successful! File downloaded.');
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
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
          {t('reportsManagement')}
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>{t('dateRange')}</InputLabel>
            <Select
              value={dateRange}
              label={t('dateRange')}
              onChange={(e) => setDateRange(e.target.value as any)}
            >
              <MenuItem value="today">{t('today')}</MenuItem>
              <MenuItem value="week">{t('thisWeek')}</MenuItem>
              <MenuItem value="month">{t('thisMonth')}</MenuItem>
              <MenuItem value="all">{t('allTime')}</MenuItem>
            </Select>
          </FormControl>
          <Button
            startIcon={<DownloadIcon />}
            variant="contained"
            onClick={handleExportReport}
            disabled={exporting}
          >
            {exporting ? t('exporting') + '...' : t('exportReport')}
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={2}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {t('totalVisits')}
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
                {t('orders')}
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
                {t('enquiries')}
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
                {t('followups')}
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
                {t('avgDay')}
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
                {t('hitRatio')}
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
            {t('salesmanPerformance')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>{t('salesman')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('totalVisits')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('dailyAvg')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('orders')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('enquiries')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('followups')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('hitRatio')}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salesmanStats.map((stat) => (
                  <TableRow key={stat.salesman_id} hover>
                    <TableCell>{getBilingualDisplay(stat.salesman_name, stat.salesman_name_ar, i18n.language === 'ar')}</TableCell>
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
                {t('topCustomers')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>{t('customer')}</strong></TableCell>
                      <TableCell align="right"><strong>{t('visits')}</strong></TableCell>
                      <TableCell align="right"><strong>{t('orders')}</strong></TableCell>
                      <TableCell align="right"><strong>{t('lastVisit')}</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerStats.slice(0, 10).map((stat, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{getBilingualDisplay(stat.customer_name, stat.customer_name_ar, i18n.language === 'ar')}</TableCell>
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
                {t('topProducts')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>{t('product')}</strong></TableCell>
                      <TableCell align="right"><strong>{t('discussionCount')}</strong></TableCell>
                      <TableCell align="right"><strong>{t('percentage')}</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productStats.slice(0, 10).map((stat, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{getBilingualDisplay(stat.product_name, stat.product_name_ar, i18n.language === 'ar')}</TableCell>
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
