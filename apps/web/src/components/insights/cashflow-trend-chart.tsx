'use client';

import { formatINR, formatINRCompact, type MonthBucket } from '@/lib/insights';
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
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import { colorAt } from '../reports/chart-palette';

interface CashflowTrendChartProps {
  data: MonthBucket[];
  className?: string;
}

/**
 * Income against expense, month by month, with net on the same scale — all three
 * are rupees, so they share one axis. (Two axes would let any pair of shapes be
 * made to look like whatever the reader already believed.)
 */
export function CashflowTrendChart({
  data,
  className,
}: CashflowTrendChartProps) {
  const chartConfig = {
    income: { label: 'Income', color: colorAt(2) },
    expense: { label: 'Expense', color: colorAt(1) },
    net: { label: 'Net', color: colorAt(6) },
  };

  const hasData = data.some((b) => b.income !== 0 || b.expense !== 0);

  if (!hasData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Cashflow</CardTitle>
          <CardDescription>
            Income against spending, month by month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No transactions in this window
          </div>
        </CardContent>
      </Card>
    );
  }

  const negativeMonths = data.filter((b) => b.net < 0).length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Cashflow</CardTitle>
        <CardDescription>
          Income against spending, month by month
          {negativeMonths > 0 &&
            ` · ${negativeMonths} month${negativeMonths === 1 ? '' : 's'} spent more than earned`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ComposedChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
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
              width={56}
              tickFormatter={formatINRCompact}
            />
            <ReferenceLine y={0} stroke="var(--color-border)" />
            <ChartTooltip
              cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
              content={
                <ChartTooltipContent
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
            <Bar
              dataKey="income"
              fill={colorAt(2)}
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              dataKey="expense"
              fill={colorAt(1)}
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
            <Line
              type="monotone"
              dataKey="net"
              stroke={colorAt(6)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--color-card)', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
