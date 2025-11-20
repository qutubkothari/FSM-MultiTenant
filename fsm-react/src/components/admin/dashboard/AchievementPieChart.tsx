import { memo } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PerformanceData } from './types';

const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#30cfd0', '#ff6b6b', '#4ecdc4'];

interface Props {
  data: PerformanceData[];
}

function AchievementPieChart({ data }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Visits Achievement Distribution
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="visits_achievement"
              nameKey="salesman_name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={(entry) => `${entry.salesman_name}: ${entry.visits_achievement}%`}
            >
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default memo(AchievementPieChart);
