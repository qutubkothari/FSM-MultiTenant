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

function OrderValueChart({ data }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Order Value: Target vs Actual (₹)
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="salesman_name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="target_order_value" fill="#43e97b" name="Target Value" />
            <Bar dataKey="actual_order_value" fill="#fa709a" name="Actual Value" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default memo(OrderValueChart);
