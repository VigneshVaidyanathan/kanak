'use client';

import { cn } from '@kanak/ui';

interface ProgressCellProps {
  budget: number;
  actual: number;
  /** Savings/income style: passing the budget is the goal, falling short is bad. */
  goodWhenOver?: boolean;
}

// Soft fills, not solid blocks — the bar reads as a tint behind the number.
const GOOD_FILL = 'bg-emerald-500/85';
const BAD_FILL = 'bg-rose-500/85';
const GOOD_TEXT = 'text-emerald-700';
const BAD_TEXT = 'text-rose-600';

// The overshoot is hatched so it reads as excess at a glance, not as more bar.
// White over the fill, so it works against either the green or the red.
const STRIPES = {
  backgroundImage:
    'repeating-linear-gradient(45deg, transparent 0 3px, rgba(255,255,255,0.5) 3px 6px)',
};

export function ProgressCell({
  budget,
  actual,
  goodWhenOver = false,
}: ProgressCellProps) {
  const percentage = budget > 0 ? (actual / budget) * 100 : 0;
  // Nothing planned but money moved: every rupee of it is excess.
  const isUnbudgeted = budget <= 0 && actual > 0;
  const isOver = percentage > 100 || isUnbudgeted;
  // Hitting the target exactly is hitting it: 100.0% on the label must not read
  // as a shortfall, so the threshold matches what the label rounds to.
  const meetsTarget = percentage >= 99.95;
  const isGood = goodWhenOver ? isOver || meetsTarget : !isOver;

  // Over budget: the track represents the actual, so the budget shrinks to a
  // fraction of it and the excess grows with the overshoot. Clamping both
  // to 100% made 170% and 1688% look identical.
  const budgetWidth = isUnbudgeted
    ? 0
    : isOver
      ? (100 / percentage) * 100
      : percentage;
  const overWidth = isOver ? 100 - budgetWidth : 0;

  // Within budget the fill means "as planned"; only the overshoot is judged
  // separately, and for savings an overshoot is the point.
  const baseFill =
    goodWhenOver && !isOver && !meetsTarget ? BAD_FILL : GOOD_FILL;
  const excessFill = goodWhenOver ? GOOD_FILL : BAD_FILL;

  return (
    <div className="flex items-center gap-2 w-full">
      <div
        className="flex-1 h-3 bg-muted rounded-full overflow-hidden flex"
        title={
          isUnbudgeted
            ? `Unbudgeted — ₹${actual.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} ${goodWhenOver ? 'saved' : 'spent'} with no budget set`
            : isOver
              ? `${percentage.toFixed(1)}% of budget — ${
                  goodWhenOver ? 'above plan by' : 'over by'
                } ₹${(actual - budget).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : `${percentage.toFixed(1)}% of budget`
        }
      >
        <div
          className={cn('h-full transition-all', baseFill)}
          style={{ width: `${budgetWidth}%` }}
        />
        {isOver && (
          <div
            className={cn(
              'h-full transition-all',
              excessFill,
              !isUnbudgeted && 'border-l-2 border-background'
            )}
            style={{ width: `${overWidth}%`, ...STRIPES }}
          />
        )}
      </div>
      <div
        className={cn(
          'text-xs min-w-[45px] text-right tabular-nums',
          isOver || goodWhenOver
            ? cn('font-medium', isGood ? GOOD_TEXT : BAD_TEXT)
            : 'text-muted-foreground'
        )}
      >
        {isUnbudgeted ? 'N/A' : `${percentage.toFixed(1)}%`}
      </div>
    </div>
  );
}
