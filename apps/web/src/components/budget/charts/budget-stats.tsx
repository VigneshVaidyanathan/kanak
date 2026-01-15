import { useAuthStore } from '@/store/auth-store';
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
import { useEffect, useState } from 'react';

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
  const { token } = useAuthStore();
  const [previousIncome, setPreviousIncome] = useState<number | null>(null);
  const [previousExpense, setPreviousExpense] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  // Fetch previous month's budgets
  useEffect(() => {
    const fetchPreviousMonthData = async (): Promise<void> => {
      if (!token) return;

      const [prevYear, prevMonth] = getPreviousMonth(year, month);
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/budgets?year=${prevYear}&month=${prevMonth}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const budgets = await response.json();

          // We need to distinguish between income and expense
          // Fetch categories to properly calculate
          const categoriesResponse = await fetch('/api/categories', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (categoriesResponse.ok) {
            const categories = await categoriesResponse.json();
            const categoryMap = new Map(
              categories.map((cat: { title: string; type: string }) => [
                cat.title,
                cat.type,
              ])
            );

            const prevIncome = budgets
              .filter(
                (b: { categoryId: string }) =>
                  categoryMap.get(b.categoryId) === 'income'
              )
              .reduce(
                (sum: number, b: { amount: number }) => sum + b.amount,
                0
              );

            const prevExpense = budgets
              .filter(
                (b: { categoryId: string }) =>
                  categoryMap.get(b.categoryId) === 'expense'
              )
              .reduce(
                (sum: number, b: { amount: number }) => sum + b.amount,
                0
              );

            setPreviousIncome(prevIncome);
            setPreviousExpense(prevExpense);
          }
        }
      } catch (error) {
        console.error('Error fetching previous month data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreviousMonthData();
  }, [token, year, month]);

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
          <CardAction>
            <Badge variant="outline" className="flex items-center gap-1">
              {isLoading ? (
                'Loading...'
              ) : incomeChange !== null ? (
                <>
                  {incomeChange >= 0 ? (
                    <IconTrendingUp className="size-3" />
                  ) : (
                    <IconTrendingDown className="size-3" />
                  )}
                  {Math.abs(incomeChange).toFixed(1)}%
                </>
              ) : (
                'Budgeted for this month'
              )}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {remaining >= 0 ? (
              <>
                {formatCurrency(remaining)} remaining{' '}
                <IconTrendingUp className="size-4" />
              </>
            ) : (
              <>
                {formatCurrency(Math.abs(remaining))} over budget{' '}
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
          <CardAction>
            <Badge variant="outline" className="flex items-center gap-1">
              {isLoading ? (
                'Loading...'
              ) : expenseChange !== null ? (
                <>
                  {expenseChange >= 0 ? (
                    <IconTrendingUp className="size-3" />
                  ) : (
                    <IconTrendingDown className="size-3" />
                  )}
                  {Math.abs(expenseChange).toFixed(1)}%
                </>
              ) : (
                'Planned expenses'
              )}
            </Badge>
          </CardAction>
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
