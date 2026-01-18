'use client';

import { BankAccountCell } from '@/components/transactions/bank-account-cell';
import { CategoryCell } from '@/components/transactions/category-cell';
import { DeleteTransactionsModal } from '@/components/transactions/delete-transactions-modal';
import { DescriptionCell } from '@/components/transactions/description-cell';
import { EditTransactionModal } from '@/components/transactions/edit-transaction-modal';
import { NotesCell } from '@/components/transactions/notes-cell';
import { OmitCell } from '@/components/transactions/omit-cell';
import {
  ApplyRulesModal,
  TransactionRuleModal,
} from '@/components/transactions/rules';
import { UploadCsvModal } from '@/components/transactions/upload-csv';
import { useAuthStore } from '@/store/auth-store';
import { useTransactionsStore } from '@/store/transactions-store';
import {
  DataTable,
  DataTableColumnHeader,
  NotReadyForMobile,
} from '@kanak/components';
import {
  BankAccount,
  Category,
  Transaction,
  TransactionRule,
} from '@kanak/shared';
import {
  Badge,
  Button,
  Checkbox,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  useDevice,
} from '@kanak/ui';
import {
  IconArrowLeft,
  IconArrowRight,
  IconChevronDown,
  IconCurrencyRupee,
  IconDots,
  IconEdit,
  IconEye,
  IconGitBranch,
  IconPlus,
  IconTable,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import {
  ColumnDef,
  PaginationState,
  ColumnFilter as TanStackColumnFilter,
} from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export default function TransactionsPage() {
  const { isDesktop } = useDevice();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, token, clearAuth } = useAuthStore();
  const { transactions, setTransactions, updateTransaction } =
    useTransactionsStore();
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [setupRuleModalOpen, setSetupRuleModalOpen] = useState(false);
  const [selectedTextForRule, setSelectedTextForRule] = useState<string>('');
  const [selectedTransactionType, setSelectedTransactionType] = useState<
    'credit' | 'debit' | undefined
  >();
  const [selectedRuleForEdit, setSelectedRuleForEdit] = useState<
    TransactionRule | undefined
  >();
  const [applyRulesModalOpen, setApplyRulesModalOpen] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<
    Transaction[]
  >([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [monthViewLoading, setMonthViewLoading] = useState(false);
  const [monthViewTransactions, setMonthViewTransactions] = useState<
    Transaction[]
  >([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTransactionForEdit, setSelectedTransactionForEdit] =
    useState<Transaction | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Initialize view type from URL (default: table)
  const viewType = useMemo<'table' | 'month'>(() => {
    const viewParam = searchParams.get('view');
    return viewParam === 'month' ? 'month' : 'table';
  }, [searchParams]);

  // Initialize year filter from URL (default to current year)
  const selectedYear = useMemo<number | 'all'>(() => {
    const yearParam = searchParams.get('year');
    if (yearParam === 'all') {
      return 'all';
    }
    if (yearParam) {
      return parseInt(yearParam, 10);
    }
    // Default to current year
    return new Date().getFullYear();
  }, [searchParams]);

  // Initialize month for month view from URL (format: YYYY-MM)
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

  // Initialize pagination from URL (only for table view)
  const initialPagination = useMemo<PaginationState>(() => {
    if (viewType === 'month') {
      return { pageIndex: 0, pageSize: 1000 }; // Large page size to show all
    }
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');
    const pageIndex = pageParam ? Math.max(0, parseInt(pageParam, 10) - 1) : 0;
    const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : 30;
    return {
      pageIndex,
      pageSize,
    };
  }, [searchParams, viewType]);

  // Initialize column filters from URL
  const initialColumnFilters = useMemo<TanStackColumnFilter[]>(() => {
    const filters: TanStackColumnFilter[] = [];

    // Parse type filter
    const typeFilter = searchParams.get('filter_type');
    if (typeFilter) {
      const values = typeFilter.split(',').filter(Boolean);
      if (values.length > 0) {
        filters.push({ id: 'type', value: values });
      }
    }

    // Parse reports filter
    const reportsFilter = searchParams.get('filter_reports');
    if (reportsFilter) {
      const values = reportsFilter.split(',').filter(Boolean);
      if (values.length > 0) {
        filters.push({ id: 'reports', value: values });
      }
    }

    // Parse category filter
    const categoryFilter = searchParams.get('filter_category');
    if (categoryFilter) {
      const values = categoryFilter.split(',').filter(Boolean);
      if (values.length > 0) {
        filters.push({ id: 'category', value: values });
      }
    }

    // Parse bank account filter
    const bankAccountFilter = searchParams.get('filter_bankAccount');
    if (bankAccountFilter) {
      const values = bankAccountFilter.split(',').filter(Boolean);
      if (values.length > 0) {
        filters.push({ id: 'bankAccount', value: values });
      }
    }

    // Parse date range filter
    const dateFrom = searchParams.get('filter_date_from');
    const dateTo = searchParams.get('filter_date_to');
    if (dateFrom && dateTo) {
      filters.push({
        id: 'date',
        value: {
          from: new Date(dateFrom),
          to: new Date(dateTo),
        },
      });
    }

    // Parse amount range filter
    const amountMin = searchParams.get('filter_amount_min');
    const amountMax = searchParams.get('filter_amount_max');
    if (amountMin || amountMax) {
      filters.push({
        id: 'amount',
        value: {
          min: amountMin ? parseFloat(amountMin) : undefined,
          max: amountMax ? parseFloat(amountMax) : undefined,
        },
      });
    }

    return filters;
  }, [searchParams]);

  // Handle column filters changes and update URL
  const handleColumnFiltersChange = useCallback(
    (filters: TanStackColumnFilter[]) => {
      const params = new URLSearchParams(searchParams.toString());

      // Remove all existing filter params
      const filterKeys = [
        'filter_type',
        'filter_reports',
        'filter_category',
        'filter_bankAccount',
        'filter_date_from',
        'filter_date_to',
        'filter_amount_min',
        'filter_amount_max',
      ];
      filterKeys.forEach((key) => params.delete(key));

      // Add new filter params
      filters.forEach((filter) => {
        if (filter.id === 'type' && Array.isArray(filter.value)) {
          const values = (filter.value as string[]).join(',');
          if (values) params.set('filter_type', values);
        } else if (filter.id === 'reports' && Array.isArray(filter.value)) {
          const values = (filter.value as string[]).join(',');
          if (values) params.set('filter_reports', values);
        } else if (filter.id === 'category' && Array.isArray(filter.value)) {
          const values = (filter.value as string[]).join(',');
          if (values) params.set('filter_category', values);
        } else if (filter.id === 'bankAccount' && Array.isArray(filter.value)) {
          const values = (filter.value as string[]).join(',');
          if (values) params.set('filter_bankAccount', values);
        } else if (filter.id === 'date' && typeof filter.value === 'object') {
          const dateRange = filter.value as { from?: Date; to?: Date };
          if (dateRange.from) {
            params.set(
              'filter_date_from',
              dateRange.from.toISOString().split('T')[0]
            );
          }
          if (dateRange.to) {
            params.set(
              'filter_date_to',
              dateRange.to.toISOString().split('T')[0]
            );
          }
        } else if (filter.id === 'amount' && typeof filter.value === 'object') {
          const amountRange = filter.value as {
            min?: number;
            max?: number;
          };
          if (amountRange.min !== undefined) {
            params.set('filter_amount_min', String(amountRange.min));
          }
          if (amountRange.max !== undefined) {
            params.set('filter_amount_max', String(amountRange.max));
          }
        }
      });

      const newUrl = params.toString()
        ? `/transactions?${params.toString()}`
        : '/transactions';
      router.push(newUrl, { scroll: false });
    },
    [router, searchParams]
  );

  // Handle pagination changes and update URL
  const handlePaginationChange = useCallback(
    (pagination: PaginationState) => {
      const params = new URLSearchParams(searchParams.toString());
      if (pagination.pageIndex === 0) {
        params.delete('page');
      } else {
        params.set('page', String(pagination.pageIndex + 1));
      }
      if (pagination.pageSize === 30) {
        params.delete('pageSize');
      } else {
        params.set('pageSize', String(pagination.pageSize));
      }
      const newUrl = params.toString()
        ? `/transactions?${params.toString()}`
        : '/transactions';
      router.push(newUrl, { scroll: false });
    },
    [router, searchParams]
  );

  // Handle view type change
  const handleViewTypeChange = useCallback(
    (newViewType: 'table' | 'month') => {
      const params = new URLSearchParams(searchParams.toString());
      if (newViewType === 'table') {
        params.delete('view');
        // Set default month to current month if switching to month view
      } else {
        params.set('view', 'month');
        if (!params.get('month')) {
          const now = new Date();
          params.set(
            'month',
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
              2,
              '0'
            )}`
          );
        }
      }
      // Remove pagination when switching to month view
      if (newViewType === 'month') {
        params.delete('page');
        params.delete('pageSize');
      }
      const newUrl = params.toString()
        ? `/transactions?${params.toString()}`
        : '/transactions';
      router.push(newUrl, { scroll: false });
    },
    [router, searchParams]
  );

  // Handle year filter change
  const handleYearChange = useCallback(
    (year: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (year === 'all' || !year) {
        params.set('year', 'all');
      } else {
        params.set('year', year);
      }
      const newUrl = params.toString()
        ? `/transactions?${params.toString()}`
        : '/transactions';
      router.push(newUrl, { scroll: false });
    },
    [router, searchParams]
  );

  // Handle month navigation
  const handleMonthNavigation = useCallback(
    (direction: 'prev' | 'next') => {
      const [year, month] = selectedMonth.split('-').map(Number);
      let newYear = year;
      let newMonth = month;

      if (direction === 'prev') {
        newMonth -= 1;
        if (newMonth < 1) {
          newMonth = 12;
          newYear -= 1;
        }
      } else {
        newMonth += 1;
        if (newMonth > 12) {
          newMonth = 1;
          newYear += 1;
        }
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set('month', `${newYear}-${String(newMonth).padStart(2, '0')}`);
      const newUrl = `/transactions?${params.toString()}`;
      router.push(newUrl, { scroll: false });
    },
    [router, searchParams, selectedMonth]
  );

  // Set current year in URL if not present (only on initial load)
  useEffect(() => {
    const yearParam = searchParams.get('year');
    if (!yearParam) {
      const currentYear = new Date().getFullYear();
      const params = new URLSearchParams(searchParams.toString());
      params.set('year', currentYear.toString());
      const newUrl = `/transactions?${params.toString()}`;
      // Defer router update to avoid updating Router during render
      setTimeout(() => {
        router.replace(newUrl, { scroll: false });
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  useEffect(() => {
    const checkAuthAndFetch = () => {
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
              fetchTransactions();
              fetchCategories();
              fetchBankAccounts();
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
        fetchTransactions();
        fetchCategories();
        fetchBankAccounts();
      }
    };

    checkAuthAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, router]);

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

  const fetchBankAccounts = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/bank-accounts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  }, [token]);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch('/api/transactions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        clearAuth();
        router.push('/auth');
        return;
      }

      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [token, clearAuth, router, setTransactions, setLoading]);

  const handleDeleteTransaction = useCallback((transaction: Transaction) => {
    // TODO: Implement delete functionality
  }, []);

  const handleDeleteSelectedTransactions = useCallback(() => {
    if (selectedTransactions.length === 0) {
      toast.error('Please select at least one transaction');
      return;
    }
    setDeleteModalOpen(true);
  }, [selectedTransactions]);

  const handleDeleteSuccess = useCallback(() => {
    setSelectedTransactions([]);
    fetchTransactions();
  }, [fetchTransactions]);

  const handleEditTransaction = useCallback((transaction: Transaction) => {
    setSelectedTransactionForEdit(transaction);
    setEditModalOpen(true);
  }, []);

  const handleEditModalSuccess = useCallback(() => {
    fetchTransactions();
    setEditModalOpen(false);
    setSelectedTransactionForEdit(null);
  }, [fetchTransactions]);

  // Extract unique options for filters
  const categoryOptions = useMemo(() => {
    // First option is always "--No category--"
    const noCategoryOption = {
      label: '--No category--',
      value: '__NO_CATEGORY__',
    };

    // Map categories from API to filter options
    const categoryOptionsFromApi = categories
      .map((cat) => ({
        label: cat.title,
        value: cat.title,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [noCategoryOption, ...categoryOptionsFromApi];
  }, [categories]);

  const typeOptions = useMemo(
    () => [
      { label: 'Credit', value: 'credit' },
      { label: 'Debit', value: 'debit' },
    ],
    []
  );

  const reportOptions = useMemo(
    () => [
      { label: 'All', value: 'all' },
      { label: 'Including reports', value: 'including' },
      { label: 'Excluding reports', value: 'excluding' },
    ],
    []
  );

  const bankAccountOptions = useMemo(() => {
    const uniqueAccounts = new Set<string>();
    transactions.forEach((t: Transaction) => {
      if (t.bankAccount && t.bankAccount.trim()) {
        uniqueAccounts.add(t.bankAccount);
      }
    });
    return Array.from(uniqueAccounts)
      .sort()
      .map((account) => ({
        label: account,
        value: account,
      }));
  }, [transactions]);

  const handleApplyRulesToFiltered = useCallback(() => {
    if (filteredTransactions.length > 0) {
      setSelectedTransactions(filteredTransactions);
      setApplyRulesModalOpen(true);
    } else {
      toast.error('No transactions available to apply rules');
    }
  }, [filteredTransactions]);

  const transactionActions = useMemo(
    () => [
      {
        onClick: (row: Transaction) => handleEditTransaction(row),
        renderer: () => (
          <>
            <IconEdit />
            <div>Edit transaction</div>
          </>
        ),
        showSeparatorAfter: true,
      },
      {
        onClick: (row: Transaction) => handleApplyRulesToFiltered(),
        renderer: (row: Transaction) => (
          <>
            <IconGitBranch />
            <div>Apply Rules</div>
          </>
        ),
        showSeparatorAfter: true,
      },
      {
        onClick: (row: Transaction) => handleDeleteTransaction(row),
        renderer: () => (
          <>
            <IconTrash />
            <div>Delete transaction</div>
          </>
        ),
      },
    ],
    [handleEditTransaction, handleDeleteTransaction, handleApplyRulesToFiltered]
  );

  // Filter transactions by year
  const filteredTransactionsByYear = useMemo(() => {
    let filtered = transactions;

    // Filter by year using accountingDate
    if (selectedYear !== 'all') {
      filtered = filtered.filter((t: Transaction) => {
        const accountingDate = (t as any).accountingDate
          ? new Date((t as any).accountingDate)
          : new Date(t.date);
        const transactionYear = accountingDate.getFullYear();
        return transactionYear === selectedYear;
      });
    }

    return filtered;
  }, [transactions, selectedYear]);

  // Group transactions by month for month view using accountingDate
  const transactionsByMonth = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    filteredTransactionsByYear.forEach((transaction: Transaction) => {
      const accountingDate = (transaction as any).accountingDate
        ? new Date((transaction as any).accountingDate)
        : new Date(transaction.date);
      const monthKey = `${accountingDate.getFullYear()}-${String(
        accountingDate.getMonth() + 1
      ).padStart(2, '0')}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(transaction);
    });
    // Sort months descending
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, txs]) => ({
        month,
        transactions: txs.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      }));
  }, [filteredTransactionsByYear]);

  // Get transactions for selected month
  const selectedMonthTransactions = useMemo(() => {
    return (
      transactionsByMonth.find((g) => g.month === selectedMonth)
        ?.transactions || []
    );
  }, [transactionsByMonth, selectedMonth]);

  // Fetch/filter transactions for selected month when it changes
  useEffect(() => {
    if (viewType === 'month') {
      setMonthViewLoading(true);
      // Simulate API call delay and filter transactions for selected month
      const timer = setTimeout(() => {
        const monthData =
          transactionsByMonth.find((g) => g.month === selectedMonth)
            ?.transactions || [];
        setMonthViewTransactions(monthData);
        setMonthViewLoading(false);
      }, 100); // Small delay to show loading state

      return () => clearTimeout(timer);
    }
  }, [selectedMonth, transactionsByMonth, viewType]);

  // Custom update handler for month view that updates local state without full refresh
  const updateTransactionForMonthView = useCallback(
    (id: string, updates: Partial<Transaction>) => {
      // Update the store (for global state)
      updateTransaction(id, updates);

      // Update the local month view state directly (to avoid full refresh)
      if (viewType === 'month') {
        setMonthViewTransactions((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );
      }
    },
    [updateTransaction, viewType]
  );

  // Summary section renderer
  const summarySection = useCallback(
    (rows: Transaction[]) => {
      const totalTransactions = rows.length;
      const debitTotal = rows
        .filter((t) => t.type === 'debit')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const creditTotal = rows
        .filter((t) => t.type === 'credit')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const [year, month] = selectedMonth.split('-').map(Number);
      const monthName = new Date(year, month - 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      return (
        <div className="flex items-center justify-between w-full">
          {viewType === 'month' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMonthNavigation('prev')}
              className="flex items-center gap-2"
            >
              <IconArrowLeft size={16} />
              Previous Month
            </Button>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {viewType === 'month' && (
              <div className="text-base font-semibold text-foreground mr-4">
                {monthName}
              </div>
            )}
            <div className="flex items-center gap-1 p-1 px-3 rounded-md bg-white border border-gray-200">
              Total transactions:{' '}
              <span className="font-semibold text-foreground">
                {totalTransactions}
              </span>
            </div>
            <div className="flex items-center gap-1 p-1 px-3 rounded-md bg-white border border-gray-200">
              Debit:{' '}
              <span className="font-semibold text-red-600">
                ₹
                {debitTotal.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex items-center gap-1 p-1 px-3 rounded-md bg-white border border-gray-200">
              Credit:{' '}
              <span className="font-semibold text-green-600">
                ₹
                {creditTotal.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex items-center gap-1 p-1 px-3 rounded-md bg-white border border-gray-200">
              Net spending:{' '}
              <span
                className={cn(
                  'font-semibold',
                  creditTotal - debitTotal >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                ₹
                {Math.abs(creditTotal - debitTotal).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
          {viewType === 'month' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMonthNavigation('next')}
              className="flex items-center gap-2"
            >
              Next Month
              <IconArrowRight size={16} />
            </Button>
          )}
        </div>
      );
    },
    [viewType, selectedMonth, handleMonthNavigation]
  );

  // Footer row renderer - sums the amount column
  const footerRow = useCallback((rows: Transaction[]) => {
    const totalAmount = rows.reduce((sum, t) => {
      const amount = Number(t.amount);
      return sum + (t.type === 'credit' ? amount : -amount);
    }, 0);

    return (
      <div className="text-right w-full flex justify-end">
        <div
          className={cn(
            'font-semibold',
            totalAmount >= 0 ? 'text-green-600' : 'text-red-600'
          )}
        >
          {totalAmount >= 0 ? '+' : ''}₹
          {Math.abs(totalAmount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
    );
  }, []);

  // Custom filter function for category column that handles "--No category--"
  const categoryFilterFn = useCallback(
    (row: any, columnId: string, filterValue: any) => {
      if (
        !filterValue ||
        !Array.isArray(filterValue) ||
        filterValue.length === 0
      ) {
        return true;
      }

      const cellValue = row.original[columnId];
      const hasNoCategory = !cellValue || cellValue.trim() === '';

      // Separate "__NO_CATEGORY__" from regular category values
      const hasNoCategoryFilter = filterValue.includes('__NO_CATEGORY__');
      const otherCategoryValues = filterValue.filter(
        (v: string) => v !== '__NO_CATEGORY__'
      );

      // If transaction has no category, show it only if "__NO_CATEGORY__" is selected
      if (hasNoCategory) {
        return hasNoCategoryFilter;
      }

      // If transaction has a category, check if it matches any selected category
      // OR if "__NO_CATEGORY__" is also selected (for OR logic)
      if (otherCategoryValues.length > 0) {
        return otherCategoryValues.includes(cellValue);
      }

      // If only "__NO_CATEGORY__" is selected and transaction has a category, exclude it
      return false;
    },
    []
  );

  // Custom filter function for reports column
  const reportsFilterFn = useCallback(
    (row: any, columnId: string, filterValue: any) => {
      if (
        !filterValue ||
        !Array.isArray(filterValue) ||
        filterValue.length === 0
      ) {
        return true;
      }

      const isInternal = row.original.isInternal === true;

      // If "all" is selected, show everything
      if (filterValue.includes('all')) {
        return true;
      }

      // If both "including" and "excluding" are selected, show everything
      if (
        filterValue.includes('including') &&
        filterValue.includes('excluding')
      ) {
        return true;
      }

      // If only "including" is selected, show transactions where isInternal is false or undefined
      if (
        filterValue.includes('including') &&
        !filterValue.includes('excluding')
      ) {
        return !isInternal;
      }

      // If only "excluding" is selected, show transactions where isInternal is true
      if (
        filterValue.includes('excluding') &&
        !filterValue.includes('including')
      ) {
        return isInternal;
      }

      return true;
    },
    []
  );

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: 'select',
        enableHiding: false,
        size: 50,
        minSize: 50,
        header: ({ table }) => {
          const filteredRows = table.getFilteredRowModel().rows;
          const selectedRows = table.getFilteredSelectedRowModel().rows;
          const isAllSelected =
            filteredRows.length > 0 &&
            selectedRows.length === filteredRows.length;
          const isSomeSelected =
            selectedRows.length > 0 &&
            selectedRows.length < filteredRows.length;

          return (
            <Checkbox
              checked={isAllSelected || (isSomeSelected && 'indeterminate')}
              onCheckedChange={(value) => {
                if (value) {
                  // Select all filtered rows
                  const newSelection: Record<string, boolean> = {};
                  filteredRows.forEach((row) => {
                    newSelection[row.id] = true;
                  });
                  table.setRowSelection(newSelection);
                } else {
                  // Deselect all
                  table.resetRowSelection();
                }
              }}
              aria-label="Select all"
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
      },
      {
        accessorKey: 'date',
        enableHiding: false,
        meta: {
          header: 'Date',
          filter: {
            type: 'DATE_RANGE',
            text: 'Date',
            placeholder: 'Select date range...',
          },
        },
        minSize: 100,
        size: 120,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => {
          const date = new Date(row.original.date);
          return (
            <div className="text-sm">
              <div className="font-medium">
                {date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'type',
        enableHiding: true,
        meta: {
          header: 'Type',
          filter: {
            type: 'COMBOBOX',
            options: typeOptions,
            text: 'Type',
            placeholder: 'Filter by type...',
          },
        },
        size: 90,
        minSize: 80,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type" />
        ),
        cell: ({ row }) => {
          const type = row.original.type;
          return (
            <Badge
              className={cn(
                'capitalize',
                type === 'credit'
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-red-500/10 text-red-600'
              )}
            >
              {type}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'amount',
        enableHiding: true,
        meta: {
          header: 'Amount',
          filter: {
            type: 'NUMBER_RANGE',
            text: 'Amount',
            placeholder: 'Select range...',
            min: 0,
            max: 100000,
            step: 100,
            transform: (value: number) => (
              <div className="flex items-center">
                <IconCurrencyRupee size={14} />
                {value.toLocaleString()}
              </div>
            ),
          },
        },
        size: 120,
        minSize: 120,
        header: ({ column }) => (
          <DataTableColumnHeader
            className="justify-end"
            column={column}
            title="Amount"
          />
        ),
        cell: ({ row }) => {
          const amount = Number(row.original.amount);
          const isCredit = row.original.type === 'credit';
          return (
            <div className="text-sm text-right w-full flex justify-end">
              <div
                className={cn(
                  'font-semibold',
                  isCredit ? 'text-green-600' : 'text-red-600'
                )}
              >
                {isCredit ? '+' : '-'}₹
                {Math.abs(amount).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'bankAccount',
        enableHiding: true,
        meta: {
          header: 'Bank Account',
          filter: {
            type: 'COMBOBOX',
            options: bankAccountOptions,
            text: 'Bank Account',
            placeholder: 'Filter by bank account...',
          },
        },
        size: 150,
        minSize: 150,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Bank Account" />
        ),
        cell: ({ row }) => {
          return (
            <BankAccountCell
              transaction={row.original}
              bankAccounts={bankAccounts}
              token={token}
              onUpdate={
                viewType === 'month'
                  ? updateTransactionForMonthView
                  : updateTransaction
              }
            />
          );
        },
      },
      {
        accessorKey: 'category',
        enableHiding: true,
        filterFn: categoryFilterFn,
        meta: {
          header: 'Category',
          filter: {
            type: 'COMBOBOX',
            options: categoryOptions,
            text: 'Category',
            placeholder: 'Filter by category...',
          },
        },
        size: 200,
        minSize: 200,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Category" />
        ),
        cell: ({ row }) => {
          return (
            <CategoryCell
              transaction={row.original}
              categories={categories}
              token={token}
              onUpdate={
                viewType === 'month'
                  ? updateTransactionForMonthView
                  : updateTransaction
              }
            />
          );
        },
      },
      {
        accessorKey: 'description',
        enableHiding: false,
        meta: {
          header: 'Description',
          flex: true,
          wrap: true,
          maxSize: 450,
        },
        minSize: 200,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Description" />
        ),
        cell: ({ row }) => {
          return (
            <DescriptionCell
              transaction={row.original}
              onSetUpRule={(
                selectedText: string,
                transactionType: 'credit' | 'debit' | undefined
              ) => {
                setSelectedTextForRule(selectedText);
                setSelectedTransactionType(transactionType);
                setSelectedRuleForEdit(undefined);
                setSetupRuleModalOpen(true);
              }}
              onAddToExistingRule={async (
                selectedText: string,
                transactionType: 'credit' | 'debit' | undefined,
                ruleId: string
              ) => {
                try {
                  const response = await fetch(
                    `/api/transaction-rules/${ruleId}`,
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    }
                  );

                  if (!response.ok) {
                    throw new Error('Failed to fetch transaction rule');
                  }

                  const rule: TransactionRule = await response.json();
                  setSelectedRuleForEdit(rule);
                  setSelectedTextForRule(selectedText);
                  setSelectedTransactionType(transactionType);
                  setSetupRuleModalOpen(true);
                } catch (error) {
                  console.error('Error fetching rule:', error);
                  toast.error('Failed to load rule');
                }
              }}
            />
          );
        },
      },
      {
        accessorKey: 'notes',
        enableHiding: true,
        meta: {
          header: 'Notes',
        },
        size: 200,
        minSize: 150,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Notes" />
        ),
        cell: ({ row }) => {
          return (
            <NotesCell
              transaction={row.original}
              token={token}
              onUpdate={
                viewType === 'month'
                  ? updateTransactionForMonthView
                  : updateTransaction
              }
            />
          );
        },
      },
      {
        accessorKey: 'omit',
        enableHiding: true,
        enableColumnFilter: true,
        filterFn: reportsFilterFn,
        meta: {
          header: 'Include',
          filter: {
            type: 'COMBOBOX',
            options: reportOptions,
            text: 'Reports',
            placeholder: 'Filter by reports...',
          },
        },
        size: 60,
        minSize: 60,
        enableSorting: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="" />
        ),
        cell: ({ row }) => {
          return (
            <OmitCell
              transaction={row.original}
              token={token}
              onUpdate={
                viewType === 'month'
                  ? updateTransactionForMonthView
                  : updateTransaction
              }
            />
          );
        },
      },
      {
        accessorKey: 'actions',
        enableHiding: false,
        size: 60,
        meta: {
          header: 'Actions',
        },
        enableSorting: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="" />
        ),
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-end gap-2 w-full">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size={'icon-sm'}>
                    <IconDots />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>Transaction options</DropdownMenuLabel>
                  <DropdownMenuGroup>
                    {transactionActions.map((action, index) => {
                      return (
                        <div key={index}>
                          <DropdownMenuItem
                            className={
                              index === transactionActions.length - 1
                                ? 'text-destructive focus:text-destructive'
                                : undefined
                            }
                            onClick={() => action.onClick(row.original)}
                          >
                            {action.renderer(row.original)}
                          </DropdownMenuItem>
                          {action.showSeparatorAfter && (
                            <DropdownMenuSeparator />
                          )}
                        </div>
                      );
                    })}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [
      categoryOptions,
      typeOptions,
      reportOptions,
      bankAccountOptions,
      transactionActions,
      categories,
      bankAccounts,
      token,
      updateTransaction,
      updateTransactionForMonthView,
      viewType,
      categoryFilterFn,
      reportsFilterFn,
    ]
  );

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
          <h1 className="text-2xl font-bold">Transactions</h1>
          <h2 className="text-sm text-muted-foreground">
            Manage your transactions
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {selectedTransactions.length > 0 && (
            <div className="text-sm text-muted-foreground px-3 py-1.5 rounded-md bg-muted border">
              {selectedTransactions.length} transaction
              {selectedTransactions.length !== 1 ? 's' : ''} selected
            </div>
          )}
          <Select
            value={selectedYear === 'all' ? 'all' : selectedYear.toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-[120px]" size="sm">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                View Options
                <IconChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[200px] bg-background"
            >
              <DropdownMenuLabel>Table Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => handleViewTypeChange('table')}
                  className={viewType === 'table' ? 'bg-accent' : ''}
                >
                  <IconTable className="mr-2 h-4 w-4" />
                  Table View
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleViewTypeChange('month')}
                  className={viewType === 'month' ? 'bg-accent' : ''}
                >
                  <IconEye className="mr-2 h-4 w-4" />
                  Month Wise View
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Display Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <IconEye className="mr-2 h-4 w-4" />
                  Compact View
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <IconEye className="mr-2 h-4 w-4" />
                  Detailed View
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem disabled>Export as PDF</DropdownMenuItem>
                <DropdownMenuItem disabled>Export as Excel</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DataTable
        data={
          viewType === 'month'
            ? monthViewTransactions
            : filteredTransactionsByYear
        }
        columns={columns}
        isLoading={viewType === 'month' ? monthViewLoading : loading}
        searchPlaceholder="Filter transactions..."
        pagination={viewType !== 'month'}
        initialPagination={viewType === 'month' ? undefined : initialPagination}
        onPaginationChange={
          viewType === 'month' ? undefined : handlePaginationChange
        }
        initialColumnFilters={initialColumnFilters}
        onColumnFiltersChange={handleColumnFiltersChange}
        showRefresh={false}
        enableRowSelection={true}
        onSelectionChange={setSelectedTransactions}
        onFilteredRowsChange={setFilteredTransactions}
        onRowDoubleClick={handleEditTransaction}
        customSection={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions
                <IconChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Transaction Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <IconPlus className="h-4 w-4" />
                  Add transaction
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setUploadModalOpen(true)}>
                  <IconUpload className="h-4 w-4" />
                  Upload CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (selectedTransactions.length > 0) {
                      setApplyRulesModalOpen(true);
                    } else {
                      toast.error('Please select at least one transaction');
                    }
                  }}
                  disabled={selectedTransactions.length === 0}
                >
                  <IconEdit className="h-4 w-4" />
                  Apply Rules
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDeleteSelectedTransactions}
                  disabled={selectedTransactions.length === 0}
                  className="text-destructive focus:text-destructive"
                >
                  <IconTrash className="h-4 w-4" />
                  Delete transactions
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        defaultColumnSizing={{
          size: 150,
          minSize: 50,
          maxSize: 500,
        }}
        contextMenuActions={{
          title: 'Transaction Actions',
          actions: transactionActions,
        }}
        summarySection={summarySection}
        footerRow={footerRow}
      />

      {uploadModalOpen && (
        <UploadCsvModal
          onClose={() => {
            setUploadModalOpen(false);
            fetchTransactions();
          }}
        />
      )}

      <TransactionRuleModal
        open={setupRuleModalOpen}
        onOpenChange={(open: boolean) => {
          setSetupRuleModalOpen(open);
          if (!open) {
            setSelectedRuleForEdit(undefined);
            setSelectedTextForRule('');
            setSelectedTransactionType(undefined);
          }
        }}
        selectedText={selectedTextForRule}
        transactionType={selectedTransactionType}
        rule={selectedRuleForEdit}
        categories={categories}
      />

      <ApplyRulesModal
        open={applyRulesModalOpen}
        onOpenChange={(open: boolean) => {
          setApplyRulesModalOpen(open);
        }}
        selectedTransactions={selectedTransactions}
        onSuccess={() => {
          fetchTransactions();
        }}
      />

      <EditTransactionModal
        open={editModalOpen}
        onOpenChange={(open: boolean) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedTransactionForEdit(null);
          }
        }}
        transaction={selectedTransactionForEdit}
        categories={categories}
        bankAccounts={bankAccounts}
        onSuccess={handleEditModalSuccess}
      />

      <DeleteTransactionsModal
        open={deleteModalOpen}
        onOpenChange={(open: boolean) => {
          setDeleteModalOpen(open);
        }}
        transactions={selectedTransactions}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
