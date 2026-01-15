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
import dayjs from 'dayjs';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface SectionData {
  name: string;
  color: string;
  data: number[];
}

interface TotalWealthChartProps {
  data: Array<Record<string, string | number>>;
  sections: SectionData[];
}

export function TotalWealthChart({ data, sections }: TotalWealthChartProps) {
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

  const chartConfig = sections.reduce(
    (acc, section) => {
      acc[section.name] = {
        label: section.name,
        color: section.color || 'var(--color-chart-1)',
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  );

  if (data.length === 0 || sections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wealth Breakdown</CardTitle>
          <CardDescription>
            Breakdown of your wealth by section over time
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
        <CardTitle>Wealth Breakdown</CardTitle>
        <CardDescription>
          Breakdown of your wealth by section over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <AreaChart data={data}>
            <defs>
              {sections.map((section) => {
                const gradientId = `fill-${section.name.replace(/\s+/g, '-')}`;
                return (
                  <linearGradient
                    key={gradientId}
                    id={gradientId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={section.color}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={section.color}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => dayjs(value).format('DD MMM YY')}
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
                  labelFormatter={(value) => dayjs(value).format('DD MMM YY')}
                  formatter={(value: any, name: any, item: any) => {
                    return (
                      <div className="text-sm flex gap-2 w-[230px] items-center">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.stroke }}
                        ></div>
                        <div className="text-muted-foreground flex-1">
                          {name}
                        </div>
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
            {sections.map((section) => {
              const gradientId = `fill-${section.name.replace(/\s+/g, '-')}`;
              return (
                <Area
                  key={section.name}
                  type="natural"
                  dataKey={section.name}
                  stroke={section.color}
                  fill={`url(#${gradientId})`}
                  stackId="1"
                  dot={{ fill: section.color, r: 2 }}
                  activeDot={{ r: 4 }}
                />
              );
            })}
            <ChartLegend
              content={<ChartLegendContent />}
              verticalAlign="bottom"
              className="mt-4"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
