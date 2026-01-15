'use client';

import { cn } from '@kanak/ui';

interface ProgressCellProps {
  budget: number;
  actual: number;
}

export function ProgressCell({ budget, actual }: ProgressCellProps) {
  // Calculate percentage
  const percentage = budget > 0 ? (actual / budget) * 100 : 0;
  const displayPercentage = Math.min(percentage, 100);

  // Determine color based on percentage
  // Green: < 50%, Yellow: > 50% and < 100%, Red: >= 100%
  let progressColor = 'bg-green-500';
  if (percentage >= 100) {
    progressColor = 'bg-red-500';
  } else if (percentage > 50) {
    progressColor = 'bg-yellow-500';
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all', progressColor)}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground min-w-[45px] text-right">
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
}
