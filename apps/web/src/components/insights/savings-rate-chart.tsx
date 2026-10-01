'use client';

import { formatINR, type MonthBucket } from '@/lib/insights';
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
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import { colorAt } from '../reports/chart-palette';

/** A rate worth holding. Shown as a line to aim at, not as a pass/fail. */
const TARGET_RATE = 0.2;

interface SavingsRateChartProps {
  data: MonthBucket[];
  className?: string;
}

export function SavingsRateChart({ data, className }: SavingsRateChartProps) {
  // Months with no income have no rate, and joining across them would draw a
  // line through a number that does not exist.
  const points = data.map((bucket) => ({
    label: bucket.label,
    rate: bucket.savingsRate === null ? null : bucket.savingsRate * 100,
    net: bucket.net,
    income: bucket.income,
  }));

  const measured = points.filter((p) => p.rate !== null);
  const average =
    measured.length > 0
      ? measured.reduce((sum, p) => sum + (p.rate ?? 0), 0) / measured.length
      : null;

  if (measured.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Savings Rate</CardTitle>
          <CardDescription>
            Share of income left unspent each month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            No income recorded in this window
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Savings Rate</CardTitle>
        <CardDescription>
          Share of income left unspent each month
          {average !== null && ` · ${average.toFixed(0)}% average`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{ rate: { label: 'Savings rate', color: colorAt(2) } }}
          className="h-[240px] w-full"
        >
          <LineChart data={points} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={44}
              tickFormatter={(value) => `${Math.round(value)}%`}
            />
            <ReferenceLine
              y={TARGET_RATE * 100}
              stroke="var(--color-muted-foreground)"
              strokeDasharray="4 4"
              label={{
                value: `${TARGET_RATE * 100}% target`,
                position: 'insideTopRight',
                fill: 'var(--color-muted-foreground)',
                fontSize: 11,
              }}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--color-border)' }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, _name, item) => (
                    <div className="flex flex-col gap-0.5 text-sm">
                      <span className="font-mono font-medium">
                        {Number(value).toFixed(1)}% saved
                      </span>
                      <span className="text-muted-foreground">
                        {formatINR(item?.payload?.net ?? 0)} of{' '}
                        {formatINR(item?.payload?.income ?? 0)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke={colorAt(2)}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: colorAt(2) }}
              activeDot={{ r: 5, stroke: 'var(--color-card)', strokeWidth: 2 }}
              connectNulls={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
