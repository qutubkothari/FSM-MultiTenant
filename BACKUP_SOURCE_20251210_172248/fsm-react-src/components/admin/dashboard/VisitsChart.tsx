import { memo } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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

function VisitsChart({ data }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Visits: Target vs Actual
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
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
  );
}

export default memo(VisitsChart);
