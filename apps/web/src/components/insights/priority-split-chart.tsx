'use client';

import { formatINR, type PrioritySlice } from '@/lib/insights';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kanak/ui';
import { colorAt } from '../reports/chart-palette';

/**
 * A common target split. Only `needs`, `wants` and `savings` have one — insurance
 * and liabilities are whatever your policies and loans say they are, so they get
 * a bar and no verdict.
 */
const TARGET_SHARE: Partial<Record<PrioritySlice['priority'], number>> = {
  needs: 0.5,
  wants: 0.3,
  savings: 0.2,
};

const LABELS: Record<PrioritySlice['priority'], string> = {
  needs: 'Needs',
  wants: 'Wants',
  savings: 'Savings',
  insurance: 'Insurance',
  liabilities: 'Liabilities',
};

interface PrioritySplitChartProps {
  slices: PrioritySlice[];
  income: number;
  className?: string;
}

/**
 * Where this month's money actually went by priority, against the target split.
 * Plain bars rather than a pie: the question is "how far off target", which is a
 * length comparison, and five wedges cannot be compared by eye.
 *
 * ponytail: rendered as divs, not a chart library. Five horizontal bars is CSS.
 */
export function PrioritySplitChart({
  slices,
  income,
  className,
}: PrioritySplitChartProps) {
  const shown = slices.filter((slice) => slice.amount > 0);
  const widest = Math.max(
    ...shown.map((slice) => slice.share),
    ...Object.values(TARGET_SHARE).map((share) => share ?? 0)
  );

  if (shown.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Needs, Wants & Savings</CardTitle>
          <CardDescription>
            This month&rsquo;s outflow by priority
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            No spending recorded this month
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Needs, Wants & Savings</CardTitle>
        <CardDescription>
          {income > 0
            ? "This month's outflow as a share of income"
            : "This month's outflow as a share of total spending (no income yet)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {shown.map((slice, index) => {
          const target = TARGET_SHARE[slice.priority];
          const over = target !== undefined && slice.share > target;
          return (
            <div key={slice.priority} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 rounded-sm"
                    style={{ backgroundColor: colorAt(index) }}
                  />
                  {LABELS[slice.priority]}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="font-mono font-medium">
                    {formatINR(slice.amount)}
                  </span>
                  <span
                    className={
                      over
                        ? 'text-xs text-destructive'
                        : 'text-xs text-muted-foreground'
                    }
                  >
                    {(slice.share * 100).toFixed(0)}%
                    {target !== undefined && ` of ${target * 100}%`}
                  </span>
                </span>
              </div>
              <div className="relative h-2.5 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((slice.share / widest) * 100, 100)}%`,
                    backgroundColor: colorAt(index),
                  }}
                />
                {target !== undefined && (
                  // The target as a notch on the track, so "over" is visible
                  // without reading the number.
                  <div
                    aria-hidden
                    className="absolute top-[-3px] h-[17px] w-0.5 bg-foreground/50"
                    style={{ left: `${(target / widest) * 100}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
