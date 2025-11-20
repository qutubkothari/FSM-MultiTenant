import { memo } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { PerformanceData } from './types';

interface Props {
  data: PerformanceData[];
}

function AchievementLineChart({ data }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Achievement Percentage Comparison
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
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
  );
}

export default memo(AchievementLineChart);
