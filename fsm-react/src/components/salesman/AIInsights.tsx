import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Lightbulb as LightbulbIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { aiService } from '../../services/ai.service';
import { visitService } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';

export default function AIInsights() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    loadAIData();
  }, [user]);

  const loadAIData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get all visits for this salesman
      const visits = await visitService.getVisits(user.id);
      
      // Get AI insights and recommendations
      const [insightsData, recommendationsData] = await Promise.all([
        aiService.getDailyInsights(user.id, visits),
        aiService.getVisitRecommendations(visits),
      ]);
      
      setInsights(insightsData);
      setRecommendations(recommendationsData);
    } catch (error) {
      console.error('Failed to load AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'recommendation':
        return <TrendingUpIcon />;
      case 'alert':
        return <WarningIcon />;
      case 'tip':
        return <LightbulbIcon />;
      default:
        return <LightbulbIcon />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* AI Insights */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🤖 AI Insights
          </Typography>
          {insights.length === 0 ? (
            <Alert severity="info">
              No insights available yet. Complete more visits to get personalized recommendations.
            </Alert>
          ) : (
            <List>
              {insights.map((insight, index) => (
                <Box key={index}>
                  <ListItem>
                    <ListItemIcon>
                      {getInsightIcon(insight.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">
                            {insight.title}
                          </Typography>
                          <Chip
                            label={insight.priority}
                            size="small"
                            color={getPriorityColor(insight.priority) as any}
                          />
                        </Box>
                      }
                      secondary={insight.description}
                    />
                  </ListItem>
                  {index < insights.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Customer Recommendations */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📍 Recommended Customers to Visit
          </Typography>
          {recommendations.length === 0 ? (
            <Alert severity="success">
              Great job! All your customers have been visited recently.
            </Alert>
          ) : (
            <List>
              {recommendations.map((rec, index) => (
                <Box key={index}>
                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">
                            {rec.customer}
                          </Typography>
                          <Chip
                            label={rec.priority}
                            size="small"
                            color={getPriorityColor(rec.priority) as any}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            {rec.reason}
                          </Typography>
                          {rec.suggestedProducts && (
                            <Box display="flex" gap={0.5} mt={1}>
                              <Typography variant="caption" color="text.secondary">
                                Suggested:
                              </Typography>
                              {rec.suggestedProducts.map((product: string) => (
                                <Chip
                                  key={product}
                                  label={product}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                  {index < recommendations.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
