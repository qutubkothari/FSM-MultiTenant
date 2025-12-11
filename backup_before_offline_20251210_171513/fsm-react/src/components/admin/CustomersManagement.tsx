import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { supabase } from '../../services/supabase';
import { useTranslation } from 'react-i18next';
import { useTenantStore } from '../../store/tenantStore';
import { getBilingualDisplay } from '../../utils/arabicUtils';

interface CustomerData {
  customer_name: string;
  customer_name_ar?: string;
  contact_person: string;
  contact_person_ar?: string;
  customer_phone: string;
  total_visits: number;
  last_visit_date: string;
  first_visit_date: string;
  total_orders: number;
  last_meeting_type: string;
  status: string;
}

export default function CustomersManagement() {
  const { t, i18n } = useTranslation();
  const { tenant } = useTenantStore();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25, // Load only 25 at a time
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      if (!tenant?.id) {
        console.warn('No tenant selected');
        setCustomers([]);
        setLoading(false);
        return;
      }

      // Load only last 30 days for faster performance
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: visits } = await supabase
        .from('visits')
        .select('customer_name, customer_name_ar, contact_person, contact_person_ar, customer_phone, created_at, meeting_type')
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(200); // Hard limit for speed
      
      if (!visits) {
        setCustomers([]);
        setLoading(false);
        return;
      }
      
      // Group visits by customer (optimized)
      const customerMap = new Map<string, CustomerData>();
      
      visits.forEach((visit) => {
        const key = visit.customer_name;
        
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            customer_name: visit.customer_name,
            customer_name_ar: visit.customer_name_ar,
            contact_person: visit.contact_person || 'N/A',
            contact_person_ar: visit.contact_person_ar,
            customer_phone: visit.customer_phone || 'N/A',
            total_visits: 0,
            last_visit_date: visit.created_at,
            first_visit_date: visit.created_at,
            total_orders: 0,
            last_meeting_type: '',
            status: 'active',
          });
        }
        
        const customer = customerMap.get(key)!;
        customer.total_visits++;
        
        // Update last visit date
        if (new Date(visit.created_at) > new Date(customer.last_visit_date)) {
          customer.last_visit_date = visit.created_at;
          customer.last_meeting_type = Array.isArray(visit.meeting_type) 
            ? visit.meeting_type.join(', ') 
            : visit.meeting_type || 'N/A';
        }
        
        // Update first visit date
        if (new Date(visit.created_at) < new Date(customer.first_visit_date)) {
          customer.first_visit_date = visit.created_at;
        }
        
        // Count orders
        const isOrder = Array.isArray(visit.meeting_type) 
          ? visit.meeting_type.includes('Order')
          : visit.meeting_type === 'Order';
        if (isOrder) {
          customer.total_orders++;
        }
      });
      
      // Calculate status based on last visit
      const statusCheckDate = new Date();
      statusCheckDate.setDate(statusCheckDate.getDate() - 30);
      
      Array.from(customerMap.values()).forEach((customer) => {
        const lastVisit = new Date(customer.last_visit_date);
        customer.status = lastVisit < statusCheckDate ? 'inactive' : 'active';
      });
      
      const customerList = Array.from(customerMap.values())
        .sort((a, b) => new Date(b.last_visit_date).getTime() - new Date(a.last_visit_date).getTime());
      
      setCustomers(customerList);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
    setLoading(false);
  };

  const handleExport = () => {
    const exportData = customers.map((customer) => ({
      'Customer Name': customer.customer_name,
      'Contact Person': customer.contact_person,
      'Phone': customer.customer_phone,
      'Total Visits': customer.total_visits,
      'Total Orders': customer.total_orders,
      'First Visit': format(new Date(customer.first_visit_date), 'MMM dd, yyyy'),
      'Last Visit': format(new Date(customer.last_visit_date), 'MMM dd, yyyy'),
      'Last Meeting Type': customer.last_meeting_type,
      'Status': customer.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    
    // Set column widths
    const colWidths = [
      { wch: 25 }, // Customer Name
      { wch: 20 }, // Contact Person
      { wch: 15 }, // Phone
      { wch: 12 }, // Total Visits
      { wch: 12 }, // Total Orders
      { wch: 15 }, // First Visit
      { wch: 15 }, // Last Visit
      { wch: 20 }, // Last Meeting Type
      { wch: 10 }, // Status
    ];
    ws['!cols'] = colWidths;

    // Fixed for Mac/Safari compatibility
    const fileName = `Customers_Export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const columns: GridColDef[] = [
    {
      field: 'customer_name',
      headerName: t('customerName'),
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={500}>
          {getBilingualDisplay(
            params.row.customer_name,
            params.row.customer_name_ar,
            i18n.language === 'ar'
          )}
        </Typography>
      ),
    },
    { 
      field: 'contact_person', 
      headerName: t('contactPerson'), 
      width: 180,
      renderCell: (params) => (
        getBilingualDisplay(
          params.row.contact_person,
          params.row.contact_person_ar,
          i18n.language === 'ar'
        )
      ),
    },
    { field: 'customer_phone', headerName: t('phone'), width: 130 },
    {
      field: 'total_visits',
      headerName: t('totalVisits'),
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value} size="small" color="primary" />
      ),
    },
    {
      field: 'total_orders',
      headerName: t('orders'),
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value} size="small" color="success" />
      ),
    },
    {
      field: 'last_visit_date',
      headerName: t('lastVisit'),
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          {format(new Date(params.value), 'MMM dd, yyyy')}
        </Typography>
      ),
    },
    {
      field: 'last_meeting_type',
      headerName: t('lastMeeting'),
      width: 150,
    },
    {
      field: 'status',
      headerName: t('status'),
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === 'active' ? 'success' : 'default'}
          sx={{ textTransform: 'capitalize' }}
        />
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          {t('customersManagement')}
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            startIcon={<FileDownloadIcon />}
            variant="contained"
            onClick={handleExport}
            disabled={loading || customers.length === 0}
          >
            {t('exportToExcel')}
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={loadCustomers}
            disabled={loading}
          >
            {t('refresh')}
          </Button>
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={customers}
              columns={columns}
              loading={loading}
              pageSizeOptions={[25, 50, 100]}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              disableRowSelectionOnClick
              getRowId={(row) => row.customer_name}
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell:focus': {
                  outline: 'none',
                },
                '& .MuiDataGrid-columnHeader:focus': {
                  outline: 'none',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
