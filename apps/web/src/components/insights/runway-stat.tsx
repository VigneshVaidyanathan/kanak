'use client';

import { formatINR } from '@/lib/insights';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kanak/ui';

interface RunwayStatProps {
  netWorth: { total: number; asOf: number } | null;
  averageMonthlyExpense: number;
  className?: string;
}

/**
 * How long everything you own would cover your spending. A stat, not a chart:
 * one number with its two inputs beside it.
 *
 * ponytail: counts net worth whole, because nothing in the schema marks a section
 * as liquid. Add a `liquid` flag on wealth_sections to make this a real emergency
 * fund figure — until then it is an upper bound, and says so.
 */
export function RunwayStat({
  netWorth,
  averageMonthlyExpense,
  className,
}: RunwayStatProps) {
  const months =
    netWorth && averageMonthlyExpense > 0
      ? netWorth.total / averageMonthlyExpense
      : null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardDescription>Runway</CardDescription>
        <CardTitle className="font-mono text-3xl tabular-nums">
          {months === null ? '—' : `${months.toFixed(1)} months`}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
        {months === null ? (
          <span>Needs a wealth entry and at least one month of spending.</span>
        ) : (
          <>
            <span>
              <span className="font-mono text-foreground">
                {formatINR(netWorth!.total)}
              </span>{' '}
              net worth
            </span>
            <span>
              <span className="font-mono text-foreground">
                {formatINR(averageMonthlyExpense)}
              </span>{' '}
              average monthly spend
            </span>
            <span className="text-xs">
              Counts every asset, liquid or not — treat it as a ceiling.
            </span>
          </>
        )}
      </CardContent>
    </Card>
  );
}
