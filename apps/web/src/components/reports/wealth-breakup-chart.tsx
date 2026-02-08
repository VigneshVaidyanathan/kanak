'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@kanak/ui';
import { Cell, Pie, PieChart } from 'recharts';
import type { WealthBreakupItem } from './total-wealth-stat';

const CONTRASTING_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

interface WealthBreakupChartProps {
  data: WealthBreakupItem[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function WealthBreakupChart({ data }: WealthBreakupChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0 || total === 0) {
    return (
      <Card className="gap-0">
        <CardHeader>
          <CardTitle className="text-base font-medium text-muted-foreground">
            Wealth breakup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-sm min-h-[280px] text-muted-foreground w-full">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = data.reduce(
    (acc, item, index) => {
      acc[item.name] = {
        label: item.name,
        color:
          item.color ?? CONTRASTING_COLORS[index % CONTRASTING_COLORS.length],
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  );

  return (
    <Card className="gap-0">
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">
          Wealth breakup
        </CardTitle>
      </CardHeader>
      <CardContent className="gap-0">
        <ChartContainer
          config={chartConfig}
          className="h-auto min-h-[280px] w-full"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="text-sm flex gap-2 w-[200px] items-center">
                      <div className="text-muted-foreground flex-1">
                        {String(name)}
                      </div>
                      <div className="font-medium font-mono">
                        {formatCurrency(Number(value))}
                      </div>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={60}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={chartConfig[entry.name]?.color}
                />
              ))}
            </Pie>
            <ChartLegend
              content={
                <ChartLegendContent
                  payload={data.map((item) => {
                    const pct =
                      total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                    return {
                      value: `${item.name} — ${pct}%`,
                      dataKey: item.name,
                      color: chartConfig[item.name]?.color,
                      type: 'square',
                    };
                  })}
                />
              }
              verticalAlign="bottom"
              className="mt-4"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
