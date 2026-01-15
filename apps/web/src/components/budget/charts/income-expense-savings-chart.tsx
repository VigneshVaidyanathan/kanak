'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@kanak/ui';
import { Cell, Pie, PieChart } from 'recharts';

interface IncomeExpenseSavingsData {
  name: string;
  value: number;
  color: string;
}

interface IncomeExpenseSavingsChartProps {
  data: IncomeExpenseSavingsData[];
}

const CHART_COLORS = {
  Expense: 'var(--color-chart-1)',
  'Passive Savings': 'var(--color-chart-2)',
  Savings: 'var(--color-chart-3)',
};

export function IncomeExpenseSavingsChart({
  data,
}: IncomeExpenseSavingsChartProps) {
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
        label: item.name,
        color:
          item.color ||
          CHART_COLORS[item.name as keyof typeof CHART_COLORS] ||
          'var(--color-chart-1)',
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  );

  if (data.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense vs Savings Breakdown</CardTitle>
          <CardDescription>
            Overview of expenses, passive savings, and savings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense vs Savings Breakdown</CardTitle>
        <CardDescription>
          Overview of expenses, passive savings, and savings
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
                `${name}: ${(percent * 100).toFixed(1)}%`
              }
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.color ||
                    CHART_COLORS[entry.name as keyof typeof CHART_COLORS] ||
                    'var(--color-chart-1)'
                  }
                />
              ))}
            </Pie>
            <ChartLegend
              content={
                <ChartLegendContent
                  nameKey="name"
                  payload={[]}
                  verticalAlign="bottom"
                />
              }
              className="-mt-2"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
