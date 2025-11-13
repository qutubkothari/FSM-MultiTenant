import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
} from '@mui/material';
import {
  TrendingUp,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { visitService } from '../../services/supabase';

export default function SalesmanHome() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    completed: 0,
  });

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    try {
      const visits = await visitService.getVisits(user.id);
      const today = new Date().toISOString().split('T')[0];
      const todayVisits = visits.filter((v: any) => v.created_at.startsWith(today));
      const completedVisits = visits.filter((v: any) => v.status === 'completed');

      setStats({
        total: visits.length,
        today: todayVisits.length,
        completed: completedVisits.length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Welcome Section */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                fontSize: '1.5rem',
              }}
            >
              {user?.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Welcome, {user?.name}!
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Ready to make sales today?
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Today's Visits
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.today}
                  </Typography>
                </Box>
                <Schedule sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Completed
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.completed}
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Total Visits
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.total}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Quick Tips
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            • Use "New Visit" tab to create visits
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            • GPS location is automatically captured
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Check "History" for past visits
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
