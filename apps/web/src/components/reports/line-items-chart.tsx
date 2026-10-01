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
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { colorAt } from './chart-palette';

interface LineItemSeries {
  name: string;
  color: string;
  sectionName: string;
}

interface LineItemsChartProps {
  data: Array<Record<string, string | number>>;
  lineItems: LineItemSeries[];
}

export function LineItemsChart({ data, lineItems }: LineItemsChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const chartConfig = lineItems.reduce(
    (acc, item, index) => {
      acc[item.name] = { label: item.name, color: colorAt(index) };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  );

  if (data.length === 0 || lineItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Line Items Over Time</CardTitle>
          <CardDescription>
            Track individual line items across all sections
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
        <CardTitle>Line Items Over Time</CardTitle>
        <CardDescription>
          Track individual line items across all sections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px]">
          <LineChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
            <YAxis
              tickFormatter={(value) => {
                if (value >= 1000000) {
                  return `₹${(value / 1000000).toFixed(1)}M`;
                }
                if (value >= 1000) {
                  return `₹${(value / 1000).toFixed(0)}K`;
                }
                return `₹${value}`;
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <>
                      <span className="text-muted-foreground">{name}</span>
                      <span className="text-foreground font-mono font-medium tabular-nums ml-auto">
                        {formatCurrency(Number(value))}
                      </span>
                    </>
                  )}
                />
              }
            />
            {lineItems.map((lineItem, index) => (
              <Line
                key={lineItem.name}
                type="monotone"
                dataKey={lineItem.name}
                stroke={colorAt(index)}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  stroke: 'var(--color-card)',
                  strokeWidth: 2,
                }}
              />
            ))}
            <ChartLegend
              content={<ChartLegendContent nameKey="name" />}
              className="-mt-2"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
