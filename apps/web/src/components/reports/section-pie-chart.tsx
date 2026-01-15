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
import dayjs from 'dayjs';
import { Cell, Pie, PieChart } from 'recharts';

interface LineItemData {
  name: string;
  value: number;
  color?: string;
}

interface SectionPieChartProps {
  sectionName: string;
  sectionColor?: string;
  data: LineItemData[];
}

export function SectionPieChart({
  sectionName,
  sectionColor,
  data,
}: SectionPieChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Define a palette of contrasting colors for line items
  const colorPalette = [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)',
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
  ];

  // Always assign different colors from palette, ignoring any color in the data
  const chartConfig = data.reduce(
    (acc, item, index) => {
      acc[item.name] = {
        label: item.name,
        color: colorPalette[index % colorPalette.length],
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  );

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (data.length === 0 || total === 0) {
    return (
      <Card className="gap-0">
        <CardHeader>
          <CardTitle>{sectionName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-sm min-h-[300px] text-muted-foreground w-full">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-0">
      <CardHeader>
        <CardTitle>{sectionName}</CardTitle>
        {/* <CardDescription>Line items breakdown</CardDescription> */}
      </CardHeader>
      <CardContent className="gap-0">
        <ChartContainer
          config={chartConfig}
          className="h-auto min-h-[300px] w-full"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => dayjs(value).format('DD MMM YY')}
                  formatter={(value: any, name: any, item: any) => {
                    return (
                      <div className="text-sm flex gap-2 w-[200px] items-center">
                        <div className="text-muted-foreground flex-1">
                          {name}
                        </div>
                        <div className=" font-medium font-mono">
                          {formatCurrency(Number(value))}
                        </div>
                      </div>
                    );
                  }}
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
                  payload={data.map((item) => ({
                    value: item.name,
                    dataKey: item.name,
                    color: chartConfig[item.name]?.color,
                    type: 'square',
                  }))}
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
