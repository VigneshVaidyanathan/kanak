'use client';

import { CashflowTrendChart } from '@/components/insights/cashflow-trend-chart';
import { MonthBurndownChart } from '@/components/insights/month-burndown-chart';
import { PrioritySplitChart } from '@/components/insights/priority-split-chart';
import { RecurringTable } from '@/components/insights/recurring-table';
import { RunwayStat } from '@/components/insights/runway-stat';
import { SavingsRateChart } from '@/components/insights/savings-rate-chart';
import { TopMerchantsChart } from '@/components/insights/top-merchants-chart';
import { useInsights } from '@/hooks/use-insights';
import { formatINR } from '@/lib/insights';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
} from '@kanak/ui';

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-mono text-3xl tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {detail}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const insights = useInsights(12);

  if (insights.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const thisMonth = insights.buckets[insights.buckets.length - 1];
  const lastMonth = insights.buckets[insights.buckets.length - 2];
  const expenseDelta = lastMonth ? thisMonth.expense - lastMonth.expense : null;

  return (
    <div className="flex-1">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <h2 className="text-sm text-muted-foreground">
          The last 12 months, and where this one is heading
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Net worth"
          value={insights.netWorth ? formatINR(insights.netWorth.total) : '—'}
          detail={
            insights.netWorth
              ? `As of ${new Date(insights.netWorth.asOf).toLocaleDateString(
                  'en-IN',
                  {
                    day: '2-digit',
                    month: 'short',
                    year: '2-digit',
                  }
                )}`
              : 'No wealth entries yet'
          }
        />
        <StatCard
          label="Spent this month"
          value={formatINR(thisMonth.expense)}
          detail={
            expenseDelta === null
              ? 'No earlier month to compare'
              : `${formatINR(Math.abs(expenseDelta))} ${expenseDelta >= 0 ? 'more' : 'less'} than last month`
          }
        />
        <StatCard
          label="Saved this month"
          value={
            thisMonth.savingsRate === null
              ? '—'
              : `${(thisMonth.savingsRate * 100).toFixed(0)}%`
          }
          detail={
            thisMonth.savingsRate === null
              ? 'No income recorded this month'
              : `${formatINR(thisMonth.net)} of ${formatINR(thisMonth.income)} income`
          }
        />
        <RunwayStat
          netWorth={insights.netWorth}
          averageMonthlyExpense={insights.averageMonthlyExpense}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CashflowTrendChart data={insights.buckets} className="lg:col-span-2" />
        <PrioritySplitChart
          slices={insights.priority.slices}
          income={insights.priority.income}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MonthBurndownChart
          points={insights.burn.points}
          currentTotal={insights.burn.currentTotal}
          previousTotal={insights.burn.previousTotal}
        />
        <SavingsRateChart data={insights.buckets} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopMerchantsChart merchants={insights.merchants} />
        <RecurringTable recurring={insights.recurring} />
      </div>
    </div>
  );
}
