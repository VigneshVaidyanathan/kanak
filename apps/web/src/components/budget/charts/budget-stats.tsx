import { api } from '@kanak/convex/src/_generated/api';
import {
  Badge,
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@kanak/ui';
import { IconTrendingDown, IconTrendingUp } from '@tabler/icons-react';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

interface BudgetStatsProps {
  totalIncome: number;
  totalBudgetedExpense: number;
  year: number;
  month: number;
}

export function BudgetStats({
  totalIncome,
  totalBudgetedExpense,
  year,
  month,
}: BudgetStatsProps) {
  const categories = useQuery(api.categories.getCategoriesByUserId, {});
  // title -> type, for splitting the previous month's budgets into income and
  // expense. Budgets still come from the REST route.
  const categoryTypes = useMemo(
    () => new Map((categories ?? []).map((cat) => [cat.title, cat.type])),
    [categories]
  );
  // Calculate previous month
  const getPreviousMonth = (y: number, m: number): [number, number] => {
    let prevYear = y;
    let prevMonth = m - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }
    return [prevYear, prevMonth];
  };

  // Previous month's budgets, for the change-vs-last-month figures.
  const [prevYear, prevMonth] = getPreviousMonth(year, month);
  const previousBudgets = useQuery(api.budgets.getBudgetsByUserId, {
    year: prevYear,
    month: prevMonth,
  });
  const isLoading = previousBudgets === undefined || categories === undefined;

  const { previousIncome, previousExpense } = useMemo(() => {
    if (!previousBudgets) {
      return { previousIncome: null, previousExpense: null };
    }
    const sumByType = (type: string) =>
      previousBudgets
        .filter((budget) => categoryTypes.get(budget.categoryId) === type)
        .reduce((sum, budget) => sum + budget.amount, 0);

    return {
      previousIncome: sumByType('income'),
      previousExpense: sumByType('expense'),
    };
  }, [previousBudgets, categoryTypes]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate percentage change
  const calculatePercentageChange = (
    current: number,
    previous: number | null
  ): number | null => {
    if (previous === null || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const incomeChange = calculatePercentageChange(totalIncome, previousIncome);
  const expenseChange = calculatePercentageChange(
    totalBudgetedExpense,
    previousExpense
  );

  // Calculate remaining (income - expenses)
  const remaining = totalIncome - totalBudgetedExpense;
  const remainingPercentage =
    totalIncome > 0 ? (remaining / totalIncome) * 100 : 0;

  return (
    <div className="flex flex-wrap gap-5">
      <Card className="flex-1 max-w-[300px]">
        <CardHeader>
          <CardDescription>Total Income</CardDescription>
          <CardTitle className="text-3xl tabular-nums @[250px]/card:text-3xl font-mono">
            {formatCurrency(totalIncome)}
          </CardTitle>
          {!isLoading && incomeChange !== null && (
            <CardAction>
              <Badge variant="outline" className="flex items-center gap-1">
                {incomeChange >= 0 ? (
                  <IconTrendingUp className="size-3" />
                ) : (
                  <IconTrendingDown className="size-3" />
                )}
                {Math.abs(incomeChange).toFixed(1)}%
              </Badge>
            </CardAction>
          )}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {/* Both sides are planned figures, so this is the slice of the plan
                not yet assigned to a category — not cash in hand. */}
            {remaining >= 0 ? (
              <>
                {formatCurrency(remaining)} unallocated{' '}
                <IconTrendingUp className="size-4" />
              </>
            ) : (
              <>
                {formatCurrency(Math.abs(remaining))} over-allocated{' '}
                <IconTrendingUp className="size-4 rotate-180" />
              </>
            )}
          </div>
          {/* <div className="text-muted-foreground">
            {remainingPercentage >= 0
              ? `${remainingPercentage.toFixed(1)}% of income remaining`
              : `${Math.abs(remainingPercentage).toFixed(1)}% over budget`}
          </div> */}
        </CardFooter>
      </Card>
      <Card className="@container/card flex-1 max-w-[300px]">
        <CardHeader>
          <CardDescription>Total Budgeted Expense</CardDescription>
          <CardTitle className="text-3xl tabular-nums @[250px]/card:text-3xl font-mono">
            {formatCurrency(totalBudgetedExpense)}
          </CardTitle>
          {!isLoading && expenseChange !== null && (
            <CardAction>
              <Badge variant="outline" className="flex items-center gap-1">
                {expenseChange >= 0 ? (
                  <IconTrendingUp className="size-3" />
                ) : (
                  <IconTrendingDown className="size-3" />
                )}
                {Math.abs(expenseChange).toFixed(1)}%
              </Badge>
            </CardAction>
          )}
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {totalIncome > 0
              ? `${((totalBudgetedExpense / totalIncome) * 100).toFixed(1)}% of income`
              : 'No income budgeted'}{' '}
            <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Total planned spending for this month
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
