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
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { colorAt } from './chart-palette';

interface TotalWealthAreaChartProps {
  data: Array<{ date: string; total: number }>;
  className?: string;
}

export function TotalWealthAreaChart({
  data,
  className,
}: TotalWealthAreaChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format number in Indian standards (lakhs, crores)
  const formatIndianNumber = (value: number): string => {
    if (value >= 10000000) {
      // Crores
      const crores = value / 10000000;
      return `₹${crores.toFixed(crores >= 10 ? 0 : 1)}Cr`;
    } else if (value >= 100000) {
      // Lakhs
      const lakhs = value / 100000;
      return `₹${lakhs.toFixed(lakhs >= 10 ? 0 : 1)}L`;
    } else if (value >= 1000) {
      // Thousands
      const thousands = value / 1000;
      return `₹${thousands.toFixed(thousands >= 10 ? 0 : 1)}K`;
    }
    return `₹${value}`;
  };

  // Format date as DD, MMM, YY
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = String(date.getFullYear()).slice(-2);
    return `${day}, ${month}, ${year}`;
  };

  const chartConfig = {
    total: {
      label: 'Total Wealth',
      color: colorAt(0),
    },
  };

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Total Wealth Over Time</CardTitle>
          <CardDescription>
            Track your total wealth across all sections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-sm text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Total Wealth Over Time</CardTitle>
        <CardDescription>
          Track your total wealth across all sections
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col min-h-0">
        <ChartContainer
          config={chartConfig}
          className="h-full min-h-[200px] w-full flex-1"
        >
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorAt(0)} stopOpacity={0.35} />
                <stop offset="95%" stopColor={colorAt(0)} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => formatDate(value)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatIndianNumber(value)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatDate(String(value))}
                  formatter={(value: any, name: any, item: any) => {
                    return (
                      <div className="text-sm flex gap-2 w-[150px] items-center">
                        <div className=" font-medium font-mono">
                          {formatCurrency(Number(value))}
                        </div>
                      </div>
                    );
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              type="natural"
              dataKey="total"
              stroke={colorAt(0)}
              strokeWidth={2}
              fill="url(#fillTotal)"
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--color-card)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
