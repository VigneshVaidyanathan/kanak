'use client';

import { formatINR, formatINRCompact, type DayFlow } from '@/lib/insights';
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
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface MonthTrajectoryChartProps {
  flows: DayFlow[];
  className?: string;
}

const chartConfig = {
  cumIncome: { label: 'Income in', color: 'var(--color-chart-2)' },
  cumExpense: { label: 'Spent', color: 'var(--color-chart-1)' },
  cumSavings: { label: 'Saved', color: 'var(--color-chart-3)' },
  cumLeft: { label: 'Left', color: 'var(--color-chart-4)' },
};

/** The month running from the 1st to the 31st: what came in, and what is left. */
export function MonthTrajectoryChart({
  flows,
  className,
}: MonthTrajectoryChartProps) {
  // A future day would draw a line to zero, which reads as "income collapsed".
  const data = flows.filter((flow) => !flow.future);
  const empty = data.every(
    (flow) =>
      flow.cumIncome === 0 && flow.cumExpense === 0 && flow.cumSavings === 0
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Month Trajectory</CardTitle>
        <CardDescription>Cumulative flow, 1st to today</CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Nothing recorded this month
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                interval="preserveStartEnd"
                minTickGap={16}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                width={56}
                tickFormatter={formatINRCompact}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => `Day ${label}`}
                    formatter={(value, name) => (
                      <>
                        <span className="text-muted-foreground">
                          {chartConfig[name as keyof typeof chartConfig]
                            ?.label ?? name}
                        </span>
                        <span className="text-foreground font-mono font-medium tabular-nums ml-auto">
                          {formatINR(Number(value))}
                        </span>
                      </>
                    )}
                  />
                }
              />
              {(Object.keys(chartConfig) as (keyof typeof chartConfig)[]).map(
                (key) => (
                  <Area
                    key={key}
                    dataKey={key}
                    type="monotone"
                    stroke={chartConfig[key].color}
                    fill={chartConfig[key].color}
                    fillOpacity={key === 'cumLeft' ? 0.05 : 0.15}
                    strokeWidth={key === 'cumLeft' ? 2 : 1.5}
                    strokeDasharray={key === 'cumLeft' ? '4 3' : undefined}
                    dot={false}
                  />
                )
              )}
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
