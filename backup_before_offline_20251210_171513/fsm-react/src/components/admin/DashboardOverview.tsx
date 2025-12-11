import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  Receipt,
  Inventory,
  People,
} from '@mui/icons-material';
import { visitService, productService, salesmanService } from '../../services/supabase';

interface StatCard {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [visits, products, salesmen] = await Promise.all([
        visitService.getVisits(),
        productService.getProducts(),
        salesmanService.getSalesmen(),
      ]);

      const today = new Date().toISOString().split('T')[0];
      const todayVisits = visits.filter((v: any) => v.created_at.startsWith(today));
      const activeProducts = products.filter((p: any) => p.is_active);
      const activeSalesmen = salesmen.filter((s: any) => s.is_active);

      setStats([
        {
          title: 'Total Visits',
          value: visits.length.toString(),
          icon: <Receipt sx={{ fontSize: 40 }} />,
          color: '#667eea',
          bgColor: '#f0f1ff',
        },
        {
          title: "Today's Visits",
          value: todayVisits.length.toString(),
          icon: <TrendingUp sx={{ fontSize: 40 }} />,
          color: '#f093fb',
          bgColor: '#fff0fb',
        },
        {
          title: 'Active Products',
          value: activeProducts.length.toString(),
          icon: <Inventory sx={{ fontSize: 40 }} />,
          color: '#4facfe',
          bgColor: '#f0faff',
        },
        {
          title: 'Active Salesmen',
          value: activeSalesmen.length.toString(),
          icon: <People sx={{ fontSize: 40 }} />,
          color: '#43e97b',
          bgColor: '#f0fff5',
        },
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Error loading stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
        Dashboard Overview
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                background: stat.bgColor,
                borderLeft: `4px solid ${stat.color}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                },
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ color: stat.color }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: stat.color, opacity: 0.8 }}>{stat.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity Section */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Quick Stats
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome to your FSM Admin Dashboard. Select a menu item from the sidebar to manage
            visits, products, salesmen, or customers.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
