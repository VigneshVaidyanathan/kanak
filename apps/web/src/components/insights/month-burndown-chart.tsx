'use client';

import { formatINR, formatINRCompact, type BurnPoint } from '@/lib/insights';
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
import { colorAt } from '../reports/chart-palette';

interface MonthBurndownChartProps {
  points: BurnPoint[];
  currentTotal: number;
  previousTotal: number;
  className?: string;
}

/**
 * Running spend this month against the same day last month — the only chart here
 * that can be acted on before the month ends.
 */
export function MonthBurndownChart({
  points,
  currentTotal,
  previousTotal,
  className,
}: MonthBurndownChartProps) {
  const chartConfig = {
    current: { label: 'This month', color: colorAt(1) },
    previous: { label: 'Last month', color: colorAt(0) },
  };

  // Compare like with like: this month's total against last month's figure on
  // the same day, not against its full-month total.
  const today = points.filter((point) => point.current !== null).length;
  const previousToDate = points[today - 1]?.previous ?? 0;
  const delta = currentTotal - previousToDate;

  if (currentTotal === 0 && previousTotal === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Spending So Far</CardTitle>
          <CardDescription>Running total against last month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            No spending in either month
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Spending So Far</CardTitle>
        <CardDescription>
          {formatINR(currentTotal)} by day {today} ·{' '}
          {delta === 0
            ? 'level with last month'
            : `${formatINR(Math.abs(delta))} ${delta > 0 ? 'ahead of' : 'behind'} last month`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <LineChart data={points} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={4}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={56}
              tickFormatter={formatINRCompact}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--color-border)' }}
              labelFormatter={(value) => `Day ${value}`}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(value) => `Day ${value}`}
                  formatter={(value, name) => (
                    <div className="flex w-[150px] items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label ??
                          name}
                      </span>
                      <span className="font-mono font-medium">
                        {formatINR(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="previous"
              stroke={colorAt(0)}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke={colorAt(1)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--color-card)', strokeWidth: 2 }}
              connectNulls={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
