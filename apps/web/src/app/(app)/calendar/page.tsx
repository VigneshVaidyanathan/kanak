'use client';

import { MonthNavigation } from '@/components/budget/month-navigation';
import { DayDetailModal } from '@/components/calendar/day-detail-modal';
import { FilterSelect } from '@/components/calendar/filter-select';
import {
  bucketOf,
  formatINRCompact,
  monthTrajectory,
  type InsightCategory,
  type InsightTransaction,
} from '@/lib/insights';
import { Icon, NotReadyForMobile, type IconName } from '@kanak/components';
import { api } from '@kanak/convex/src/_generated/api';
import { Category, Transaction } from '@kanak/shared';
import { Button, Spinner, useDevice } from '@kanak/ui';
import { useQuery } from 'convex/react';
import { useSearchParams } from 'next/navigation';
import { Fragment, useMemo, useState } from 'react';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** One line per flow, in the order money moves through a month. */
const FLOWS = [
  {
    key: 'income',
    label: 'income',
    back: 'clawed back',
    tone: 'text-green-600',
  },
  { key: 'expense', label: 'spent', back: 'refunded', tone: 'text-red-600' },
  { key: 'savings', label: 'saved', back: 'withdrawn', tone: 'text-teal-600' },
  {
    key: 'passiveSavings',
    label: 'passive',
    back: 'withdrawn',
    tone: 'text-purple-600',
  },
] as const;

/** Monday-first column index, matching WEEKDAYS. */
const weekdayIndex = (date: Date) => (date.getDay() + 6) % 7;

export default function CalendarPage() {
  const { isDesktop } = useDevice();
  const searchParams = useSearchParams();
  const [openDate, setOpenDate] = useState<number | null>(null);
  const [accountFilter, setAccountFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

  const [year, month] = useMemo(() => {
    const monthParam = searchParams.get('month');
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      return [y, m];
    }
    const now = new Date();
    return [now.getFullYear(), now.getMonth() + 1];
  }, [searchParams]);

  const transactionsResult = useQuery(
    api.transactions.getTransactionsByUserIdAndAccountingDateRange,
    {
      startAccountingDate: new Date(year, month - 1, 1).getTime(),
      endAccountingDate: new Date(year, month, 0, 23, 59, 59).getTime(),
    }
  );
  const categoriesResult = useQuery(api.categories.getCategoriesByUserId, {});

  const allTransactions = useMemo(
    () => (transactionsResult ?? []) as Transaction[],
    [transactionsResult]
  );

  // One filtered list feeds both the grid and the modal, so they can never
  // disagree about what is being shown.
  const transactions = useMemo(
    () =>
      allTransactions.filter((transaction) => {
        if (
          accountFilter.length > 0 &&
          !accountFilter.includes(transaction.bankAccount)
        ) {
          return false;
        }
        if (
          categoryFilter.length > 0 &&
          !categoryFilter.includes(transaction.category ?? '__none__')
        ) {
          return false;
        }
        if (typeFilter.length > 0 && !typeFilter.includes(transaction.type)) {
          return false;
        }
        return true;
      }),
    [allTransactions, accountFilter, categoryFilter, typeFilter]
  );
  const categories = useMemo(
    () => (categoriesResult ?? []) as Category[],
    [categoriesResult]
  );

  const categoryTypes = useMemo(
    () => new Map(categories.map((c) => [c.title, c.type])),
    [categories]
  );
  const accountOptions = useMemo(
    () =>
      Array.from(
        new Set(allTransactions.map((t) => t.bankAccount).filter(Boolean))
      )
        .sort()
        .map((account) => ({ value: account, label: account })),
    [allTransactions]
  );

  const categoryOptions = useMemo(
    () => [
      ...categories
        .filter((category) => category.active)
        .map((category) => ({
          value: category.title,
          label: category.title,
          adornment: (
            <Icon
              name={category.icon as IconName}
              size={14}
              style={{ color: category.color }}
            />
          ),
        })),
      { value: '__none__', label: 'Uncategorised' },
    ],
    [categories]
  );

  const categoryByTitle = useMemo(
    () => new Map(categories.map((c) => [c.title, c])),
    [categories]
  );

  const flows = useMemo(
    () =>
      monthTrajectory(
        transactions as unknown as InsightTransaction[],
        categories as unknown as InsightCategory[],
        year,
        month
      ),
    [transactions, categories, year, month]
  );

  /**
   * The day's transactions, split the way the modal shows them. Savings sit on
   * the expense side: the money left the account either way, and the badge has
   * only two colours.
   */
  const byDay = useMemo(() => {
    const map = new Map<
      number,
      { income: Transaction[]; expense: Transaction[] }
    >();
    for (const transaction of transactions) {
      if (transaction.accountingDate === undefined) continue;
      const date = new Date(transaction.accountingDate);
      if (date.getFullYear() !== year || date.getMonth() + 1 !== month)
        continue;

      const bucket = bucketOf(
        transaction as unknown as InsightTransaction,
        categoryTypes
      );
      if (bucket === 'ignore') continue;

      const day = date.getDate();
      let entry = map.get(day);
      if (!entry) {
        entry = { income: [], expense: [] };
        map.set(day, entry);
      }
      (bucket === 'income' ? entry.income : entry.expense).push(transaction);
    }
    return map;
  }, [transactions, categoryTypes, year, month]);

  // Blank cells so the 1st lands under its own weekday, and so the last week
  // is a full row rather than a ragged edge.
  const leadingBlanks = weekdayIndex(new Date(year, month - 1, 1));
  const trailingBlanks = (7 - ((leadingBlanks + flows.length) % 7)) % 7;

  const monthTotals = useMemo(() => {
    const last = flows[flows.length - 1];
    return {
      income: last?.cumIncome ?? 0,
      out: (last?.cumExpense ?? 0) + (last?.cumSavings ?? 0),
    };
  }, [flows]);

  const todayKey = useMemo(() => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() + 1 === month
      ? now.getDate()
      : null;
  }, [year, month]);

  const openDay = openDate === null ? null : new Date(openDate).getDate();
  const openEntry = openDay === null ? undefined : byDay.get(openDay);

  if (transactionsResult === undefined || categoriesResult === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isDesktop) {
    return <NotReadyForMobile />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <h2 className="text-sm text-muted-foreground">
            Every day of the month, by accounting date
          </h2>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-right">
            <div className="text-muted-foreground text-xs">In</div>
            <div className="font-mono font-semibold text-green-600">
              +{formatINRCompact(monthTotals.income)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground text-xs">Out</div>
            <div className="font-mono font-semibold text-red-600">
              -{formatINRCompact(monthTotals.out)}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <MonthNavigation basePath="/calendar" />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <FilterSelect
          label="Account"
          options={accountOptions}
          selected={accountFilter}
          onChange={setAccountFilter}
        />
        <FilterSelect
          label="Category"
          options={categoryOptions}
          selected={categoryFilter}
          onChange={setCategoryFilter}
        />
        <FilterSelect
          label="Type"
          searchable={false}
          options={[
            { value: 'credit', label: 'Credit' },
            { value: 'debit', label: 'Debit' },
          ]}
          selected={typeFilter}
          onChange={setTypeFilter}
        />
        {(accountFilter.length > 0 ||
          categoryFilter.length > 0 ||
          typeFilter.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              setAccountFilter([]);
              setCategoryFilter([]);
              setTypeFilter([]);
            }}
          >
            Reset
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {transactions.length} of {allTransactions.length} transactions
        </span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col rounded-lg border bg-card overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/50 flex-shrink-0">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-3 py-2 text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* auto-rows-fr so the weeks share whatever height is left over. */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr min-h-0">
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <div key={`lead-${i}`} className="border-b border-r bg-muted/20" />
          ))}

          {flows.map((flow) => {
            const quiet = FLOWS.every(({ key }) => flow[key] === 0);
            const count = byDay.get(flow.day);
            const total =
              (count?.income.length ?? 0) + (count?.expense.length ?? 0);
            return (
              <button
                key={flow.day}
                type="button"
                onClick={() => setOpenDate(flow.date)}
                className={`flex flex-col items-stretch justify-start border-b border-r p-2 text-left overflow-hidden transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                  flow.future ? 'bg-muted/20' : ''
                }`}
              >
                {/* Fixed-height row: the date sits in the same spot whether or
                    not the day has a count beside it. */}
                <div className="flex h-7 items-center justify-end gap-2 mb-1.5">
                  {total > 0 && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {total} txn{total === 1 ? '' : 's'}
                    </span>
                  )}
                  <span
                    className={`inline-flex h-7 w-8 items-center justify-center rounded-full text-lg font-bold leading-none tabular-nums ${
                      todayKey === flow.day
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    {flow.day}
                  </span>
                </div>

                {quiet ? null : (
                  // Two columns so amounts share a right edge and the labels
                  // all start at the same x, however wide the numbers get.
                  <div className="mt-auto grid grid-cols-[auto_auto] justify-start items-baseline gap-x-2 gap-y-1.5">
                    {FLOWS.map(({ key, label, back, tone }) => {
                      if (flow[key] === 0) return null;
                      // A refund day makes an outflow negative: it reads as
                      // money coming back, so the sign has to flip with it.
                      const signed = key === 'income' ? flow[key] : -flow[key];
                      return (
                        <Fragment key={key}>
                          <span
                            className={`font-mono text-sm font-semibold leading-none tabular-nums text-right ${tone}`}
                          >
                            <span className="mr-0.5">
                              {signed > 0 ? '+' : '-'}
                            </span>
                            {formatINRCompact(Math.abs(signed))}
                          </span>
                          <span
                            className={`text-[11px] leading-none opacity-70 ${tone}`}
                          >
                            {(key === 'income' ? signed > 0 : signed < 0)
                              ? label
                              : back}
                          </span>
                        </Fragment>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}

          {Array.from({ length: trailingBlanks }, (_, i) => (
            <div key={`trail-${i}`} className="border-b border-r bg-muted/20" />
          ))}
        </div>
      </div>

      <DayDetailModal
        date={openDate}
        onOpenChange={(open) => !open && setOpenDate(null)}
        income={openEntry?.income ?? []}
        expense={openEntry?.expense ?? []}
        categories={categoryByTitle}
      />
    </div>
  );
}
