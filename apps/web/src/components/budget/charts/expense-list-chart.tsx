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

interface ExpenseListData {
  name: string;
  amount: number;
  color: string;
}

interface ExpenseListChartProps {
  data: ExpenseListData[];
}

export function ExpenseListChart({ data }: ExpenseListChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  if (data.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown by Category</CardTitle>
          <CardDescription>List of expenses sorted by amount</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            No expense data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = data.reduce(
    (acc, item) => {
      acc[item.name] = {
        label: item.name,
        color: item.color || 'var(--color-chart-1)',
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Breakdown by Category</CardTitle>
        <CardDescription>
          List of expenses sorted by amount (highest to lowest)
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
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={50}
              //   label={({ name, percent }: { name: string; percent: number }) =>
              //     `${name}: ${(percent * 100).toFixed(1)}%`
              //   }
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || 'var(--color-chart-1)'}
                />
              ))}
            </Pie>
            {/* <ChartLegend
              content={
                <ChartLegendContent
                  nameKey='name'
                  payload={[]}
                  verticalAlign='bottom'
                />
              }
              className='-mt-2'
            /> */}
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
