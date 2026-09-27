'use client';

import { api } from '@kanak/convex/src/_generated/api';
import { HoverCard, HoverCardContent } from '@kanak/ui';
import { useQuery } from 'convex/react';
import { useMemo, useState } from 'react';

interface BudgetTrendCardProps {
  categoryId: string;
  currentYear: number;
  currentMonth: number;
  children: React.ReactNode;
}

interface BudgetHistoryItem {
  amount: number;
  month: number;
  year: number;
}

export function BudgetTrendCard({
  categoryId,
  currentYear,
  currentMonth,
  children,
}: BudgetTrendCardProps) {
  // Only subscribe once the hover card opens; this renders per budget row.
  const [open, setOpen] = useState(false);
  const historyResult = useQuery(
    api.budgets.getBudgetHistory,
    open
      ? { categoryId, year: currentYear, month: currentMonth, months: 3 }
      : 'skip'
  );
  const history = useMemo(
    () => (historyResult ?? []) as BudgetHistoryItem[],
    [historyResult]
  );
  const loading = open && historyResult === undefined;

  // Calculate previous month budget
  const previousBudget = history.length > 0 ? history[0] : null;

  // Calculate 3-month average
  const average = useMemo(() => {
    if (history.length === 0) return null;
    const sum = history.reduce((acc, item) => acc + item.amount, 0);
    return sum / history.length;
  }, [history]);

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <HoverCard onOpenChange={setOpen}>
      {children}
      <HoverCardContent className="w-64">
        {loading ? (
          <div className="py-2 text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-semibold">Budget History</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Previous budget
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(previousBudget?.amount ?? null)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Three-month average
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(average)}
                </span>
              </div>
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
