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

function OrdersChart({ data }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Orders: Target vs Actual
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
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
  );
}

export default memo(OrdersChart);
