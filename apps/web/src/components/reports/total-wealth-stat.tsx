'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@kanak/ui';
import { IconTrendingDown, IconTrendingUp } from '@tabler/icons-react';

export interface WealthBreakupItem {
  name: string;
  value: number;
  color?: string;
}

interface TotalWealthStatProps {
  totalWealth: number;
  change: number;
  lastUpdated: Date | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function TotalWealthStat({
  totalWealth,
  change,
  lastUpdated,
}: TotalWealthStatProps) {
  const isPositive = change >= 0;

  return (
    <Card className="gap-0">
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">
          Total Wealth
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-4xl font-bold font-mono">
            ₹
            {totalWealth.toLocaleString('en-IN', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </div>
          {change !== 0 && (
            <div className="flex items-center gap-2">
              {isPositive ? (
                <IconTrendingUp stroke={2} className="h-5 w-5 text-green-600" />
              ) : (
                <IconTrendingDown className="h-5 w-5 text-red-600" />
              )}
              <div className="flex gap-1 items-center w-full">
                <span
                  className={`text-xl flex-1 font-semibold font-mono ${
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
