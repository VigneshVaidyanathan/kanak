'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@kanak/ui';
import { Cell, Pie, PieChart } from 'recharts';

interface ExpenseBreakdownData {
  name: string;
  value: number;
  color: string;
}

interface ExpenseBreakdownChartProps {
  data: ExpenseBreakdownData[];
}

const PRIORITY_COLORS: Record<string, string> = {
  needs: 'var(--color-chart-2)', // red
  wants: 'var(--color-chart-4)', // amber/orange
};

export function ExpenseBreakdownChart({ data }: ExpenseBreakdownChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const chartConfig = data.reduce(
    (acc, item) => {
      acc[item.name] = {
        label: item.name.charAt(0).toUpperCase() + item.name.slice(1),
        color:
          item.color || PRIORITY_COLORS[item.name] || 'var(--color-chart-1)',
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  );

  if (data.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>
            Expense breakdown by priority (Needs vs Wants)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            No expense data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>
          Expense breakdown by priority (Needs vs Wants)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={50}
              label={({ name, percent }: { name: string; percent: number }) =>
                `${name.charAt(0).toUpperCase() + name.slice(1)}: ${(
                  percent * 100
                ).toFixed(1)}%`
              }
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.color ||
                    PRIORITY_COLORS[entry.name] ||
                    'var(--color-chart-1)'
                  }
                />
              ))}
            </Pie>
            {/* <ChartLegend
              content={<ChartLegendContent nameKey='name' payload={[]} verticalAlign='bottom' />}
              className='-mt-2'
            /> */}
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
