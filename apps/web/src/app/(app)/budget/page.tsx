'use client';

import { ActualCell } from '@/components/budget/actual-cell';
import { BudgetAmountCell } from '@/components/budget/budget-amount-cell';
import { BudgetStats } from '@/components/budget/charts/budget-stats';
import { TopCategoriesChart } from '@/components/insights/top-categories-chart';
import { ExpenseBreakdownChart } from '@/components/budget/charts/expense-breakdown-chart';
import { ExpenseListChart } from '@/components/budget/charts/expense-list-chart';
import { IncomeExpenseSavingsChart } from '@/components/budget/charts/income-expense-savings-chart';
import { MonthTrajectoryChart } from '@/components/budget/charts/month-trajectory-chart';
import { CopyBudgetsModal } from '@/components/budget/copy-budgets-modal';
import { MonthNavigation } from '@/components/budget/month-navigation';
import { ProgressCell } from '@/components/budget/progress-cell';
import { Icon, NotReadyForMobile } from '@kanak/components';
import {
  monthTrajectory,
  type InsightCategory,
  type InsightTransaction,
} from '@/lib/insights';
import { api } from '@kanak/convex/src/_generated/api';
import { Budget, Category, Transaction } from '@kanak/shared';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Spinner,
  useDevice,
} from '@kanak/ui';
import {
  IconCalculator,
  IconChevronDown,
  IconCopy,
  IconExternalLink,
  IconSelector,
  IconSortAscending,
  IconSortDescending,
} from '@tabler/icons-react';
import { useMutation, useQuery } from 'convex/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const typeLabels: Record<string, string> = {
  income: 'Income',
  expense: 'Expense',
  'intra-transfer': 'Intra Transfer',
  'passive-savings': 'Passive Savings',
  savings: 'Savings',
};

const typeColors: Record<string, string> = {
  income: 'bg-green-500/10 text-green-600',
  expense: 'bg-red-500/10 text-red-600',
  'intra-transfer': 'bg-blue-500/10 text-blue-600',
  'passive-savings': 'bg-purple-500/10 text-purple-600',
  savings: 'bg-teal-500/10 text-teal-600',
};

const priorityLabels: Record<string, string> = {
  needs: 'Needs',
  wants: 'Wants',
  savings: 'Savings',
  insurance: 'Insurance',
  liabilities: 'Liabilities',
};

const priorityColors: Record<string, string> = {
  needs: 'bg-blue-500/10 text-blue-600',
  wants: 'bg-orange-500/10 text-orange-600',
  savings: 'bg-green-500/10 text-green-600',
  insurance: 'bg-purple-500/10 text-purple-600',
  liabilities: 'bg-red-500/10 text-red-600',
};

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
}) {
  const SortIcon = !active
    ? IconSelector
    : dir === 'asc'
      ? IconSortAscending
      : IconSortDescending;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 text-sm font-medium hover:text-foreground transition-colors ${
        active ? 'text-foreground' : 'text-muted-foreground'
      } ${className ?? ''}`}
    >
      {label}
      <SortIcon size={14} />
    </button>
  );
}

interface BudgetRow {
  categoryId: string;
  categoryTitle: string;
  categoryIcon: string;
  categoryColor: string;
  categoryDescription?: string;
  categoryType: string;
  categoryPriority?: string;
  budget: number;
  actual: number;
  originalBudget: number;
  note: string;
  originalNote: string;
  hasChanged: boolean;
  goodWhenOver: boolean;
  month: number;
  year: number;
}

const INFLOW_TYPES = new Set(['income', 'savings', 'passive-savings']);

// Where income goes. Income is the figure the total is measured against, and an
// intra-transfer moves money without spending or saving it, so neither counts.
const OUTFLOW_TYPES = new Set(['expense', 'passive-savings', 'savings']);

export default function BudgetPage() {
  const { isDesktop } = useDevice();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoriesResult = useQuery(api.categories.getCategoriesByUserId, {});
  const categories = useMemo(
    () => (categoriesResult ?? []) as Category[],
    [categoriesResult]
  );
  const [budgetRows, setBudgetRows] = useState<BudgetRow[]>([]);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);

  // Initialize month from URL (format: YYYY-MM)
  const selectedMonth = useMemo<string>(() => {
    const monthParam = searchParams.get('month');
    if (monthParam) return monthParam;
    // Default to current month
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}`;
  }, [searchParams]);

  // Parse selected month
  const [year, month] = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return [y, m];
  }, [selectedMonth]);

  const budgetsResult = useQuery(api.budgets.getBudgetsByUserId, {
    year,
    month,
  });
  const budgets = useMemo(
    () => (budgetsResult ?? []) as Budget[],
    [budgetsResult]
  );
  const createOrUpdateBudget = useMutation(api.budgets.createOrUpdateBudget);
  const recalculateActuals = useMutation(api.budgets.recalculateActuals);

  // The month's transactions by accounting date, for the actuals column.
  const monthTransactionsResult = useQuery(
    api.transactions.getTransactionsByUserIdAndAccountingDateRange,
    {
      startAccountingDate: new Date(year, month - 1, 1).getTime(),
      endAccountingDate: new Date(year, month, 0, 23, 59, 59).getTime(),
    }
  );
  const monthTransactions = useMemo(
    () => (monthTransactionsResult ?? []) as Transaction[],
    [monthTransactionsResult]
  );

  // Day-by-day running totals for the month, for the trajectory chart.
  const trajectory = useMemo(
    () =>
      monthTrajectory(
        monthTransactions as unknown as InsightTransaction[],
        categories as unknown as InsightCategory[],
        year,
        month
      ),
    [monthTransactions, categories, year, month]
  );

  // Calculate actual spending per category from month transactions (from API, accounting date)
  const calculateActuals = useCallback((): Record<string, number> => {
    if (!monthTransactions || monthTransactions.length === 0) {
      return {};
    }

    const actualsByCategory: Record<string, number> = {};

    monthTransactions.forEach((t: Transaction) => {
      const categoryId = t.category || '__NO_CATEGORY__';
      const amount = Number(t.amount);
      // Debit increases spending, credit decreases spending
      const contribution = t.type === 'debit' ? amount : -amount;

      if (!actualsByCategory[categoryId]) {
        actualsByCategory[categoryId] = 0;
      }
      actualsByCategory[categoryId] += contribution;
    });

    return actualsByCategory;
  }, [monthTransactions]);

  // Build budget rows (actuals from month transactions fetched by accounting date)
  const buildBudgetRows = useCallback((): void => {
    const calculatedActuals = calculateActuals();
    const budgetMap = new Map<string, Budget>();
    budgets.forEach((b) => {
      budgetMap.set(b.categoryId, b);
    });

    const rows: BudgetRow[] = categories.map((category) => {
      const budget = budgetMap.get(category.title);
      const budgetAmount = budget?.amount || 0;
      // Use actuals computed from month transactions (API), fallback to stored actual
      const actual = calculatedActuals[category.title] ?? budget?.actual ?? 0;
      const budgetNote = budget?.note || '';

      return {
        categoryId: category.title,
        categoryTitle: category.title,
        categoryIcon: category.icon,
        categoryColor: category.color,
        categoryDescription: category.description,
        categoryType: category.type,
        categoryPriority: category.priority,
        budget: budgetAmount,
        actual: Math.abs(actual), // Show absolute value for display
        // Savings and income are targets to beat; expenses are ceilings.
        goodWhenOver: INFLOW_TYPES.has(category.type),
        originalBudget: budgetAmount,
        note: budgetNote,
        originalNote: budgetNote,
        hasChanged: false,
        month,
        year,
      };
    });

    setBudgetRows(rows);
  }, [categories, budgets, calculateActuals, month, year]);

  useEffect(() => {
    buildBudgetRows();
  }, [buildBudgetRows]);

  const loading =
    categoriesResult === undefined ||
    budgetsResult === undefined ||
    monthTransactionsResult === undefined;

  // Handle budget amount change
  const handleBudgetChange = useCallback(
    (categoryId: string, amount: number) => {
      setBudgetRows((prev) =>
        prev.map((row) => {
          if (row.categoryId === categoryId) {
            return {
              ...row,
              budget: amount,
              hasChanged:
                amount !== row.originalBudget || row.note !== row.originalNote,
            };
          }
          return row;
        })
      );
    },
    []
  );

  // Handle note change
  const handleNoteChange = useCallback((categoryId: string, note: string) => {
    setBudgetRows((prev) =>
      prev.map((row) => {
        if (row.categoryId === categoryId) {
          return {
            ...row,
            note,
            hasChanged:
              row.budget !== row.originalBudget || note !== row.originalNote,
          };
        }
        return row;
      })
    );
  }, []);

  // Autosave: 500ms after the last edit, push every changed row.
  const [isSaving, setIsSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const changedRows = budgetRows.filter((row) => row.hasChanged);
    if (changedRows.length === 0) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await Promise.all(
          changedRows.map((row) =>
            createOrUpdateBudget({
              categoryId: row.categoryId,
              month: row.month,
              year: row.year,
              amount: row.budget,
              note: row.note,
            })
          )
        );

        // Only clear the rows we actually saved: an edit made mid-flight keeps
        // its hasChanged flag and gets picked up by the next run.
        const saved = new Map(
          changedRows.map((row) => [row.categoryId, row] as const)
        );
        setBudgetRows((prev) =>
          prev.map((row) => {
            const sent = saved.get(row.categoryId);
            if (!sent || row.budget !== sent.budget || row.note !== sent.note) {
              return row;
            }
            return {
              ...row,
              originalBudget: row.budget,
              originalNote: row.note,
              hasChanged: false,
            };
          })
        );

        toast.success(
          `Saved ${changedRows.length} budget${
            changedRows.length > 1 ? 's' : ''
          }`
        );
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('Error saving budgets:', error);
        toast.error(err.message || 'Failed to save budgets');
      } finally {
        setIsSaving(false);
      }
    }, 500);
  }, [budgetRows, createOrUpdateBudget]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    []
  );

  // Handle recalculate actuals (page-level loader)
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculateActuals = useCallback(async (): Promise<void> => {
    setIsRecalculating(true);
    try {
      await recalculateActuals({ year, month });

      toast.success('Actuals recalculated successfully');

      // Budgets are a live query; only the month's transactions need refetching.
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Error recalculating actuals:', error);
      toast.error(err.message || 'Failed to recalculate actuals');
    } finally {
      setIsRecalculating(false);
    }
  }, [year, month, recalculateActuals]);

  // Create category map for quick lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((cat) => {
      map.set(cat.title, cat);
    });
    return map;
  }, [categories]);

  const [sort, setSort] = useState<{
    key: 'category' | 'budget' | 'actual';
    dir: 'asc' | 'desc';
  } | null>(null);

  const toggleSort = useCallback((key: 'category' | 'budget' | 'actual') => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  }, []);

  const sortedRows = useMemo(() => {
    if (!sort) return budgetRows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...budgetRows].sort((a, b) =>
      sort.key === 'category'
        ? factor * a.categoryTitle.localeCompare(b.categoryTitle)
        : factor * (a[sort.key] - b[sort.key])
    );
  }, [budgetRows, sort]);

  // Link to the transactions page scoped to this month and category.
  const transactionsHref = useCallback(
    (categoryTitle: string) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      const params = new URLSearchParams({
        from: `${year}-${pad(month)}-01`,
        to: `${year}-${pad(month)}-${pad(lastDay)}`,
        filter_category: categoryTitle,
      });
      return `/transactions?${params.toString()}`;
    },
    [year, month]
  );

  const totals = useMemo(
    () =>
      budgetRows
        .filter((row) => OUTFLOW_TYPES.has(row.categoryType))
        .reduce(
          (acc, row) => ({
            budget: acc.budget + row.budget,
            actual: acc.actual + row.actual,
          }),
          { budget: 0, actual: 0 }
        ),
    [budgetRows]
  );

  // Per-type subtotals, in the order the labels are declared.
  const totalsByType = useMemo(() => {
    const byType = new Map<string, { budget: number; actual: number }>();
    budgetRows.forEach((row) => {
      const sum = byType.get(row.categoryType) ?? { budget: 0, actual: 0 };
      sum.budget += row.budget;
      sum.actual += row.actual;
      byType.set(row.categoryType, sum);
    });
    return Object.keys(typeLabels)
      .filter((type) => byType.has(type))
      .map((type) => ({ type, ...byType.get(type)! }));
  }, [budgetRows]);

  // Calculate chart data
  const chartData = useMemo(() => {
    // Total Income
    const totalIncome = budgetRows
      .filter((row) => {
        const category = categoryMap.get(row.categoryId);
        return category?.type === 'income';
      })
      .reduce((sum, row) => sum + row.budget, 0);

    // Total Budgeted Expense
    const totalBudgetedExpense = budgetRows
      .filter((row) => {
        const category = categoryMap.get(row.categoryId);
        return category?.type === 'expense';
      })
      .reduce((sum, row) => sum + row.budget, 0);

    // Passive Savings
    const passiveSavings = budgetRows
      .filter((row) => {
        const category = categoryMap.get(row.categoryId);
        return category?.type === 'passive-savings';
      })
      .reduce((sum, row) => sum + row.budget, 0);

    // Savings
    const savings = budgetRows
      .filter((row) => {
        const category = categoryMap.get(row.categoryId);
        return category?.type === 'savings';
      })
      .reduce((sum, row) => sum + row.budget, 0);

    // Income breakdown data
    const incomeBreakdown = budgetRows
      .filter((row) => {
        const category = categoryMap.get(row.categoryId);
        return category?.type === 'income' && row.budget > 0;
      })
      .map((row) => ({
        name: row.categoryTitle,
        amount: row.budget,
        color: row.categoryColor,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Expense list by category — what was actually spent, not what was planned
    const expenseList = budgetRows
      .filter((row) => {
        const category = categoryMap.get(row.categoryId);
        return category?.type === 'expense' && row.actual > 0;
      })
      .map((row) => ({
        name: row.categoryTitle,
        amount: row.actual,
        color: row.categoryColor,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Expense breakdown by priority (Needs vs Wants)
    const expenseByPriority = budgetRows
      .filter((row) => {
        const category = categoryMap.get(row.categoryId);
        return category?.type === 'expense' && row.budget > 0;
      })
      .reduce(
        (acc, row) => {
          const category = categoryMap.get(row.categoryId);
          const priority = category?.priority || 'wants';
          if (priority === 'needs' || priority === 'wants') {
            if (!acc[priority]) {
              acc[priority] = 0;
            }
            acc[priority] += row.budget;
          }
          return acc;
        },
        {} as Record<string, number>
      );

    const expenseBreakdown = [
      {
        name: 'needs',
        value: expenseByPriority.needs || 0,
        color: 'var(--color-chart-2)',
      },
      {
        name: 'wants',
        value: expenseByPriority.wants || 0,
        color: 'var(--color-chart-4)',
      },
    ].filter((item) => item.value > 0);

    // Expense vs Passive Savings vs Savings
    const incomeExpenseSavings = [
      {
        name: 'Expense',
        value: totalBudgetedExpense,
        color: 'var(--color-chart-1)',
      },
      {
        name: 'Passive Savings',
        value: passiveSavings,
        color: 'var(--color-chart-2)',
      },
      {
        name: 'Savings',
        value: savings,
        color: 'var(--color-chart-3)',
      },
    ].filter((item) => item.value > 0);

    return {
      totalIncome,
      totalBudgetedExpense,
      incomeBreakdown,
      expenseBreakdown,
      incomeExpenseSavings,
      expenseList,
    };
  }, [budgetRows, categoryMap]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>
          <Spinner />
        </div>
      </div>
    );
  }

  if (!isDesktop) {
    return <NotReadyForMobile />;
  }

  return (
    <div className="flex-1">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Budget</h1>
          <h2 className="text-sm text-muted-foreground">
            Manage your monthly budgets by category
          </h2>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-4 flex justify-end items-center gap-2">
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                Budget Actions
                <IconChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsCopyModalOpen(true)}>
                <IconCopy size={16} />
                <span>Copy budgets</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleRecalculateActuals}
                disabled={isRecalculating}
              >
                <IconCalculator size={16} />
                <span>
                  {isRecalculating ? 'Loading...' : 'Recalculate Actuals'}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <MonthNavigation />
      </div>

      <CopyBudgetsModal
        open={isCopyModalOpen}
        onOpenChange={setIsCopyModalOpen}
        sourceYear={year}
        sourceMonth={month}
      />

      {/* Stats cards at the top */}
      <div className="mb-6">
        <BudgetStats
          totalIncome={chartData.totalIncome}
          totalBudgetedExpense={chartData.totalBudgetedExpense}
          year={year}
          month={month}
        />
      </div>

      {/* Charts - full width */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ExpenseBreakdownChart data={chartData.expenseBreakdown} />
        <IncomeExpenseSavingsChart data={chartData.incomeExpenseSavings} />
        <ExpenseListChart data={chartData.expenseList} />
      </div>

      {/* Where the month's money actually went */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <TopCategoriesChart
          rows={budgetRows.filter((row) => row.categoryType === 'expense')}
        />
        <MonthTrajectoryChart className="lg:col-span-2" flows={trajectory} />
      </div>

      {/* Full width table */}
      <div className="rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center gap-4 p-1 border-b bg-muted/50 px-3">
          <div className="w-[260px] flex-shrink-0">
            <SortHeader
              label="Category"
              active={sort?.key === 'category'}
              dir={sort?.dir ?? 'asc'}
              onClick={() => toggleSort('category')}
            />
          </div>
          <div className="w-[170px] flex-shrink-0">
            <SortHeader
              label="Budget Amount"
              active={sort?.key === 'budget'}
              dir={sort?.dir ?? 'asc'}
              onClick={() => toggleSort('budget')}
            />
          </div>
          <div className="w-[110px] flex-shrink-0">
            <SortHeader
              label="Actual Spend"
              active={sort?.key === 'actual'}
              dir={sort?.dir ?? 'asc'}
              onClick={() => toggleSort('actual')}
              className="justify-end w-full"
            />
          </div>
          <div className="w-[280px] flex-shrink-0">
            <span className="text-sm font-medium text-muted-foreground">
              Progress
            </span>
          </div>
          <div className="w-[250px] flex-shrink-0">
            <span className="text-sm font-medium text-muted-foreground">
              Tags
            </span>
          </div>
          <div className="flex-1 min-w-[200px]">
            <span className="text-sm font-medium text-muted-foreground">
              Note
            </span>
          </div>
        </div>

        {/* List Items */}
        <div className="flex flex-col divide-y">
          {budgetRows.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              No categories found
            </div>
          ) : (
            sortedRows.map((row) => (
              <div
                key={row.categoryId}
                className="flex items-center gap-4 p-2 hover:bg-accent/50 transition-colors"
              >
                {/* Category Icon + Name + Description */}
                <div className="flex items-center gap-3 w-[260px] flex-shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${row.categoryColor}20`,
                    }}
                  >
                    <Icon
                      name={row.categoryIcon as any}
                      size={18}
                      style={{ color: row.categoryColor }}
                    />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium text-sm truncate">
                      {row.categoryTitle}
                    </span>
                    {row.categoryDescription && (
                      <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {row.categoryDescription}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    title={`View ${row.categoryTitle} transactions`}
                    onClick={() =>
                      router.push(transactionsHref(row.categoryTitle))
                    }
                  >
                    <IconExternalLink size={15} />
                  </Button>
                </div>

                {/* Budget Amount */}
                <div className="w-[170px] flex-shrink-0">
                  <BudgetAmountCell
                    categoryId={row.categoryId}
                    initialAmount={row.budget}
                    onAmountChange={handleBudgetChange}
                    currentYear={year}
                    currentMonth={month}
                  />
                </div>

                {/* Actual */}
                <div className="w-[110px] flex-shrink-0">
                  <ActualCell amount={row.actual} />
                </div>

                {/* Progress */}
                <div className="w-[280px] flex-shrink-0">
                  <ProgressCell
                    budget={row.budget}
                    actual={row.actual}
                    goodWhenOver={row.goodWhenOver}
                  />
                </div>

                {/* Tags */}
                <div className="w-[250px] flex-shrink-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={
                        typeColors[row.categoryType] ||
                        'bg-gray-500/10 text-gray-600'
                      }
                    >
                      {typeLabels[row.categoryType] || row.categoryType}
                    </Badge>
                    {row.categoryPriority && (
                      <Badge
                        className={
                          priorityColors[row.categoryPriority] ||
                          'bg-gray-500/10 text-gray-600'
                        }
                      >
                        {priorityLabels[row.categoryPriority] ||
                          row.categoryPriority}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Note */}
                <div className="flex-1 min-w-[200px]">
                  <Input
                    type="text"
                    value={row.note}
                    onChange={(e) =>
                      handleNoteChange(row.categoryId, e.target.value)
                    }
                    placeholder="Add a note..."
                    className="w-full"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        {budgetRows.length > 0 && (
          <>
            {totalsByType.map((sum) => (
              <div
                key={sum.type}
                className="flex items-center gap-4 p-2 border-t bg-muted/30 text-sm"
              >
                <div className="w-[260px] flex-shrink-0 text-muted-foreground">
                  {typeLabels[sum.type] || sum.type}
                </div>
                <div className="w-[170px] flex-shrink-0">
                  ₹
                  {sum.budget.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="w-[110px] flex-shrink-0">
                  <ActualCell amount={sum.actual} />
                </div>
                <div className="w-[280px] flex-shrink-0" />
                <div className="w-[250px] flex-shrink-0" />
                <div className="flex-1 min-w-[200px]" />
              </div>
            ))}
            <div className="flex items-center gap-4 p-2 border-t bg-muted/50 font-semibold">
              <div className="w-[260px] flex-shrink-0 text-sm">
                Total allocated
              </div>
              <div className="w-[170px] flex-shrink-0 text-sm">
                ₹
                {totals.budget.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="w-[110px] flex-shrink-0">
                <ActualCell amount={totals.actual} />
              </div>
              <div className="w-[280px] flex-shrink-0" />
              <div className="w-[250px] flex-shrink-0" />
              <div className="flex-1 min-w-[200px]" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
