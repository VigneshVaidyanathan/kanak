'use client';

import { formatINR, formatINRCompact } from '@/lib/insights';
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
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts';

export interface TopCategoryRow {
  categoryTitle: string;
  actual: number;
  categoryColor?: string;
}

interface TopCategoriesChartProps {
  rows: TopCategoryRow[];
  className?: string;
}

/** Where the month's money actually went — the ten biggest categories. */
export function TopCategoriesChart({
  rows,
  className,
}: TopCategoriesChartProps) {
  const data = rows
    .filter((row) => row.actual > 0)
    .sort((a, b) => b.actual - a.actual)
    .slice(0, 10)
    .map((row) => ({
      label: row.categoryTitle,
      actual: row.actual,
      color: row.categoryColor || 'var(--color-chart-1)',
    }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Top Categories</CardTitle>
        <CardDescription>Biggest spends this month</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Nothing spent this month
          </div>
        ) : (
          <ChartContainer
            config={{ actual: { label: 'Spent' } }}
            className="h-[300px] w-full"
          >
            <BarChart
              data={data}
              margin={{ left: 4, right: 4, top: 4, bottom: 4 }}
            >
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={70}
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
                cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    formatter={(value, _name, item) => (
                      <div className="flex flex-col gap-0.5 text-sm">
                        <span className="text-muted-foreground">
                          {item?.payload?.label}
                        </span>
                        <span className="font-mono font-medium">
                          {formatINR(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="actual" radius={3} maxBarSize={36}>
                {data.map((row) => (
                  <Cell key={row.label} fill={row.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
