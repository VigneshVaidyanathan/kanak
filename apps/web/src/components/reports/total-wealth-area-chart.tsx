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
    forecast: {
      label: 'Projected',
      color: colorAt(0),
    },
  };

  // ponytail: least-squares straight line over the points on screen; swap for a
  // real model if seasonality ever matters.
  const chartData = (() => {
    const points = data.map((d) => ({
      ...d,
      forecast: undefined as number | undefined,
    }));
    if (data.length < 2) return points;

    const xs = data.map((d) => new Date(d.date).getTime());
    const ys = data.map((d) => d.total);
    const n = xs.length;
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    const varX = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
    if (varX === 0) return points;
    const slope =
      xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0) / varX;
    const intercept = meanY - slope * meanX;

    // Anchor the dashed line to the last real point so the two series connect.
    points[points.length - 1].forecast = ys[ys.length - 1];

    const last = new Date(xs[xs.length - 1]);
    for (let month = 1; month <= 2; month++) {
      const next = new Date(last);
      next.setMonth(next.getMonth() + month);
      points.push({
        date: next.toISOString(),
        total: undefined as unknown as number,
        forecast: slope * next.getTime() + intercept,
      });
    }
    return points;
  })();

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
          <AreaChart data={chartData}>
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
            <Area
              type="natural"
              dataKey="forecast"
              stroke={colorAt(0)}
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="none"
              dot={false}
              connectNulls
              activeDot={{ r: 4, stroke: 'var(--color-card)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
