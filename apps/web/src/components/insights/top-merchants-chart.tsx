'use client';

import { formatINR, formatINRCompact, type Merchant } from '@/lib/insights';
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
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';
import { colorAt } from '../reports/chart-palette';

interface TopMerchantsChartProps {
  merchants: Merchant[];
  className?: string;
}

/**
 * The month's biggest outflow destinations. One series ranked by size, so one
 * hue: colouring each bar differently would imply a category that is not there.
 */
export function TopMerchantsChart({
  merchants,
  className,
}: TopMerchantsChartProps) {
  if (merchants.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Where It Went</CardTitle>
          <CardDescription>Largest payees this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            No spending recorded this month
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Where It Went</CardTitle>
        <CardDescription>
          Largest payees this month, grouped by narration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{ amount: { label: 'Spend', color: colorAt(0) } }}
          className="w-full"
          style={{ height: merchants.length * 30 + 40 }}
        >
          <BarChart
            data={merchants}
            layout="vertical"
            margin={{ left: 4, right: 64, top: 4, bottom: 4 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--color-border)" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={140}
              tickMargin={6}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => (
                    <div className="flex flex-col gap-0.5 text-sm">
                      <span className="font-mono font-medium">
                        {formatINR(Number(value))}
                      </span>
                      <span className="text-muted-foreground">
                        {item?.payload?.count} payment
                        {item?.payload?.count === 1 ? '' : 's'}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="amount"
              fill={colorAt(0)}
              radius={[0, 4, 4, 0]}
              maxBarSize={18}
            >
              <LabelList
                dataKey="amount"
                position="right"
                offset={8}
                className="fill-muted-foreground"
                fontSize={11}
                formatter={formatINRCompact}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
