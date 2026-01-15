'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kanak/ui';
import { IconTrendingDown, IconTrendingUp } from '@tabler/icons-react';

interface TotalWealthStatProps {
  totalWealth: number;
  change: number;
  lastUpdated: Date | null;
}

export function TotalWealthStat({
  totalWealth,
  change,
  lastUpdated,
}: TotalWealthStatProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isPositive = change >= 0;

  return (
    <Card className="mb-6 gap-0">
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">
          Total Wealth
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-4xl font-bold">
            ₹
            {totalWealth.toLocaleString('en-IN', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </div>
          {change !== 0 && (
            <div className="flex items-center gap-2">
              {isPositive ? (
                <IconTrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <IconTrendingDown className="h-5 w-5 text-red-600" />
              )}
              <div className="flex gap-1 items-center w-full">
                <span
                  className={`text-xl flex-1 font-semibold ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {formatCurrency(change)}
                </span>
                {lastUpdated && (
                  <div className="text-sm text-muted-foreground">
                    Last updated: {formatDate(lastUpdated)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
