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
import { visitService } from '../../services/supabase';

interface CustomerData {
  customer_name: string;
  contact_person: string;
  customer_phone: string;
  total_visits: number;
  last_visit_date: string;
  first_visit_date: string;
  total_orders: number;
  last_meeting_type: string;
  status: string;
}

export default function CustomersManagement() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const visits = await visitService.getVisits();
      
      // Group visits by customer
      const customerMap = new Map<string, CustomerData>();
      
      visits.forEach((visit) => {
        const key = visit.customer_name;
        
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            customer_name: visit.customer_name,
            contact_person: visit.contact_person || 'N/A',
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
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      Array.from(customerMap.values()).forEach((customer) => {
        const lastVisit = new Date(customer.last_visit_date);
        customer.status = lastVisit < thirtyDaysAgo ? 'inactive' : 'active';
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

    const fileName = `Customers_Export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const columns: GridColDef[] = [
    {
      field: 'customer_name',
      headerName: 'Customer Name',
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={500}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'contact_person', headerName: 'Contact Person', width: 180 },
    { field: 'customer_phone', headerName: 'Phone', width: 130 },
    {
      field: 'total_visits',
      headerName: 'Total Visits',
      width: 120,
      renderCell: (params) => (
        <Chip label={params.value} size="small" color="primary" />
      ),
    },
    {
      field: 'total_orders',
      headerName: 'Orders',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value} size="small" color="success" />
      ),
    },
    {
      field: 'last_visit_date',
      headerName: 'Last Visit',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2">
          {format(new Date(params.value), 'MMM dd, yyyy')}
        </Typography>
      ),
    },
    {
      field: 'last_meeting_type',
      headerName: 'Last Meeting',
      width: 150,
    },
    {
      field: 'status',
      headerName: 'Status',
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
          Customers Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            startIcon={<FileDownloadIcon />}
            variant="contained"
            onClick={handleExport}
            disabled={loading || customers.length === 0}
          >
            Export to Excel
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={loadCustomers}
            disabled={loading}
          >
            Refresh
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
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10 },
                },
              }}
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
