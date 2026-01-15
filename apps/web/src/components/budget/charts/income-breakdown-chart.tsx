'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kanak/ui';

interface IncomeBreakdownData {
  name: string;
  amount: number;
  color: string;
}

interface IncomeBreakdownChartProps {
  data: IncomeBreakdownData[];
}

export function IncomeBreakdownChart({ data }: IncomeBreakdownChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  if (data.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income Breakdown</CardTitle>
          <CardDescription>Breakdown of income by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            No income data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Breakdown</CardTitle>
        <CardDescription>Breakdown of income by category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="w-full h-8 bg-muted rounded-full overflow-hidden flex">
            {data.map((item, index) => {
              const percentage = (item.amount / total) * 100;
              return (
                <div
                  key={index}
                  className="h-full flex items-center justify-center text-xs font-medium text-white"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  }}
                  title={`${item.name}: ${formatCurrency(item.amount)}`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            {data.map((item, index) => {
              const percentage = (item.amount / total) * 100;
              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="flex-1">{item.name}</span>
                  <span className="font-medium">
                    {formatCurrency(item.amount)}
                  </span>
                  <span className="text-muted-foreground">
                    ({percentage.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
