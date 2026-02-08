'use client';

import { ActualCell } from '@/components/budget/actual-cell';
import { BudgetAmountCell } from '@/components/budget/budget-amount-cell';
import { BudgetStats } from '@/components/budget/charts/budget-stats';
import { ExpenseBreakdownChart } from '@/components/budget/charts/expense-breakdown-chart';
import { ExpenseListChart } from '@/components/budget/charts/expense-list-chart';
import { IncomeExpenseSavingsChart } from '@/components/budget/charts/income-expense-savings-chart';
import { CopyBudgetsModal } from '@/components/budget/copy-budgets-modal';
import { MonthNavigation } from '@/components/budget/month-navigation';
import { ProgressCell } from '@/components/budget/progress-cell';
import { useAuthStore } from '@/store/auth-store';
import { Icon, NotReadyForMobile } from '@kanak/components';
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
  IconCheck,
  IconChevronDown,
  IconCopy,
} from '@tabler/icons-react';
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
  month: number;
  year: number;
}

export default function BudgetPage() {
  const { isDesktop } = useDevice();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, token, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
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

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/categories', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, [token]);

  // Fetch budgets
  const fetchBudgets = useCallback(async (): Promise<void> => {
    if (!token) return;

    const response = await fetch(`/api/budgets?year=${year}&month=${month}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      setBudgets(data);
    }
  }, [token, year, month]);

  // Fetch transactions for the selected month (by accounting date) from API
  const fetchMonthTransactions = useCallback(async (): Promise<void> => {
    if (!token) return;

    const response = await fetch(
      `/api/transactions/by-month?year=${year}&month=${month}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      setMonthTransactions(data);
    } else {
      setMonthTransactions([]);
    }
  }, [token, year, month]);

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

  // Save all changed budgets
  const [isSavingAll, setIsSavingAll] = useState(false);

  const handleSaveAll = useCallback(async () => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    const changedRows = budgetRows.filter((row) => row.hasChanged);
    if (changedRows.length === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSavingAll(true);
    try {
      // Save all changed budgets
      const savePromises = changedRows.map((row) =>
        fetch('/api/budgets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            categoryId: row.categoryId,
            month: row.month,
            year: row.year,
            amount: row.budget,
            note: row.note,
          }),
        })
      );

      const results = await Promise.all(savePromises);
      const failed = results.filter((r) => !r.ok);

      if (failed.length > 0) {
        throw new Error('Some budgets failed to save');
      }

      // Update all rows to mark as saved
      setBudgetRows((prev) =>
        prev.map((row) => ({
          ...row,
          originalBudget: row.budget,
          originalNote: row.note,
          hasChanged: false,
        }))
      );

      toast.success(
        `Successfully saved ${changedRows.length} budget${
          changedRows.length > 1 ? 's' : ''
        }`
      );

      // Refresh budgets to ensure sync
      fetchBudgets();
    } catch (error: any) {
      console.error('Error saving budgets:', error);
      toast.error(error.message || 'Failed to save budgets');
    } finally {
      setIsSavingAll(false);
    }
  }, [token, budgetRows, fetchBudgets]);

  // Handle recalculate actuals (page-level loader)
  const handleRecalculateActuals = useCallback(async (): Promise<void> => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/budgets/recalculate-actuals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          year,
          month,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to recalculate actuals');
      }

      toast.success('Actuals recalculated successfully');

      // Refresh budgets and month transactions
      await Promise.all([fetchBudgets(), fetchMonthTransactions()]);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Error recalculating actuals:', error);
      toast.error(err.message || 'Failed to recalculate actuals');
    } finally {
      setLoading(false);
    }
  }, [token, year, month, fetchBudgets, fetchMonthTransactions]);

  // Initial data fetch (page-level loader)
  useEffect(() => {
    const checkAuthAndFetch = async (): Promise<void> => {
      if (typeof window !== 'undefined') {
        const storedAuth = localStorage.getItem('auth-storage');
        if (storedAuth) {
          try {
            const parsed = JSON.parse(storedAuth);
            if (parsed.state?.token && parsed.state?.user) {
              if (!isAuthenticated) {
                const { setAuth } = useAuthStore.getState();
                setAuth(parsed.state.user, parsed.state.token);
              }
              setLoading(true);
              await Promise.all([
                fetchCategories(),
                fetchBudgets(),
                fetchMonthTransactions(),
              ]);
              setLoading(false);
              return;
            }
          } catch (e) {
            // Invalid stored data
          }
        }
      }

      if (!isAuthenticated && !token) {
        router.push('/auth');
        return;
      }

      if (isAuthenticated || token) {
        setLoading(true);
        await Promise.all([
          fetchCategories(),
          fetchBudgets(),
          fetchMonthTransactions(),
        ]);
        setLoading(false);
      }
    };

    checkAuthAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, router]);

  // Rebuild rows when data changes
  useEffect(() => {
    if (categories.length > 0) {
      buildBudgetRows();
    }
  }, [categories, budgets, monthTransactions, buildBudgetRows]);

  // When month changes (not on initial mount), refetch budgets and month transactions (page-level loader)
  const prevMonthRef = useRef<{ year: number; month: number } | null>(null);
  useEffect(() => {
    if (!token || categories.length === 0) return;
    if (prevMonthRef.current === null) {
      prevMonthRef.current = { year, month };
      return;
    }
    if (
      prevMonthRef.current.year === year &&
      prevMonthRef.current.month === month
    ) {
      return;
    }
    prevMonthRef.current = { year, month };

    const fetchData = async (): Promise<void> => {
      setLoading(true);
      await Promise.all([fetchBudgets(), fetchMonthTransactions()]);
      setLoading(false);
    };
    fetchData();
  }, [
    year,
    month,
    token,
    categories.length,
    fetchBudgets,
    fetchMonthTransactions,
  ]);

  // Create category map for quick lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((cat) => {
      map.set(cat.title, cat);
    });
    return map;
  }, [categories]);

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

    // Expense list by category (for horizontal bar chart)
    const expenseList = budgetRows
      .filter((row) => {
        const category = categoryMap.get(row.categoryId);
        return category?.type === 'expense' && row.budget > 0;
      })
      .map((row) => ({
        name: row.categoryTitle,
        amount: row.budget,
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
        <div className="mb-4 flex justify-end gap-2">
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
              <DropdownMenuItem
                onClick={handleSaveAll}
                disabled={
                  isSavingAll || !budgetRows.some((row) => row.hasChanged)
                }
              >
                <IconCheck size={16} />
                <span>{isSavingAll ? 'Saving...' : 'Save budgets'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCopyModalOpen(true)}>
                <IconCopy size={16} />
                <span>Copy budgets</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleRecalculateActuals}
                disabled={loading}
              >
                <IconCalculator size={16} />
                <span>{loading ? 'Loading...' : 'Recalculate Actuals'}</span>
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
        onSuccess={() => {
          fetchBudgets();
        }}
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

      {/* Full width table */}
      <div className="rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center gap-4 p-1 border-b bg-muted/50 px-3">
          <div className="min-w-[200px] flex-shrink-0">
            <span className="text-sm font-medium text-muted-foreground">
              Category
            </span>
          </div>
          <div className="flex-1 min-w-[170px] max-w-[170px]">
            <span className="text-sm font-medium text-muted-foreground">
              Budget Amount
            </span>
          </div>
          <div className="flex-shrink-0 min-w-[110px]">
            <span className="text-sm font-medium text-muted-foreground flex justify-end">
              Actual Spend
            </span>
          </div>
          <div className="flex-1 min-w-[200px] max-w-[300px]">
            <span className="text-sm font-medium text-muted-foreground">
              Progress
            </span>
          </div>
          <div className="min-w-[150px] flex-shrink-0">
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
            budgetRows.map((row) => (
              <div
                key={row.categoryId}
                className="flex items-center gap-4 p-2 hover:bg-accent/50 transition-colors"
              >
                {/* Category Icon + Name + Description */}
                <div className="flex items-center gap-3 min-w-[200px] flex-shrink-0">
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
                    <span className="font-medium text-sm">
                      {row.categoryTitle}
                    </span>
                    {row.categoryDescription && (
                      <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {row.categoryDescription}
                      </span>
                    )}
                  </div>
                </div>

                {/* Budget Amount */}
                <div className="flex-1 min-w-[170px] max-w-[170px]">
                  <BudgetAmountCell
                    categoryId={row.categoryId}
                    initialAmount={row.budget}
                    onAmountChange={handleBudgetChange}
                    currentYear={year}
                    currentMonth={month}
                  />
                </div>

                {/* Actual */}
                <div className="flex-shrink-0 min-w-[110px]">
                  <ActualCell amount={row.actual} />
                </div>

                {/* Progress */}
                <div className="flex-1 min-w-[230px] max-w-[300px]">
                  <ProgressCell budget={row.budget} actual={row.actual} />
                </div>

                {/* Tags */}
                <div className="min-w-[250px] flex-shrink-0">
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
      </div>
    </div>
  );
}
