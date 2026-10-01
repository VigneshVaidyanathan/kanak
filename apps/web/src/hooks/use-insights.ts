'use client';

import {
  burndown,
  detectRecurring,
  monthlyBuckets,
  prioritySplit,
  spendByCategory,
  topMerchants,
  type InsightCategory,
  type InsightTransaction,
} from '@/lib/insights';
import { api } from '@kanak/convex/src/_generated/api';
import { useQuery } from 'convex/react';
import { useMemo, useState } from 'react';

/**
 * One subscription feeding every insight chart: a rolling window of
 * transactions plus the categories that give them meaning, aggregated once.
 *
 * The window is fixed on mount rather than recomputed per render — Convex keys
 * its subscription on the argument object, so a `new Date()` in the arguments
 * would tear down and rebuild the subscription on every render.
 */
export function useInsights(months = 12) {
  const [window] = useState(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth() - (months - 1), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      now,
    };
  });

  const transactionsResult = useQuery(
    api.transactions.getTransactionsByUserIdAndAccountingDateRange,
    {
      startAccountingDate: window.from.getTime(),
      endAccountingDate: window.to.getTime(),
    }
  );
  const categoriesResult = useQuery(api.categories.getCategoriesByUserId, {});
  const sectionsResult = useQuery(api.wealth.getWealthSectionsByUserId, {});
  const wealthEntriesResult = useQuery(api.wealth.getWealthEntriesByDateRange, {
    startDate: window.from.getTime(),
    endDate: window.to.getTime(),
  });

  const loading =
    transactionsResult === undefined ||
    categoriesResult === undefined ||
    sectionsResult === undefined ||
    wealthEntriesResult === undefined;

  // Memoised so the empty-array fallback keeps one identity: every aggregation
  // below depends on these, and a fresh `[]` per render would redo all of them.
  const transactions = useMemo(
    () => (transactionsResult ?? []) as InsightTransaction[],
    [transactionsResult]
  );
  const categories = useMemo(
    () => (categoriesResult ?? []) as InsightCategory[],
    [categoriesResult]
  );

  const buckets = useMemo(
    () => monthlyBuckets(transactions, categories, window.from, window.to),
    [transactions, categories, window]
  );

  /** The current calendar month, for the charts that only describe "now". */
  const thisMonth = useMemo(() => {
    const start = new Date(
      window.now.getFullYear(),
      window.now.getMonth(),
      1
    ).getTime();
    return transactions.filter((t) => t.accountingDate >= start);
  }, [transactions, window]);

  const priority = useMemo(
    () => prioritySplit(thisMonth, categories),
    [thisMonth, categories]
  );

  const merchants = useMemo(
    () => topMerchants(thisMonth, categories, 10),
    [thisMonth, categories]
  );

  const categorySpend = useMemo(
    () => spendByCategory(thisMonth, categories),
    [thisMonth, categories]
  );

  // ponytail: a 12-month window can only ever see monthly and quarterly
  // repeats — a yearly charge needs three of them. Widen `months` if annual
  // renewals matter.
  const recurring = useMemo(
    () => detectRecurring(transactions, window.now.getTime()),
    [transactions, window]
  );

  const burn = useMemo(
    () => burndown(transactions, categories, window.now),
    [transactions, categories, window]
  );

  /**
   * Net worth at the most recent date anyone entered, applying each section's
   * add/subtract operation — the same arithmetic the wealth grid shows.
   */
  const netWorth = useMemo(() => {
    const entries = wealthEntriesResult ?? [];
    const sections = sectionsResult ?? [];
    if (entries.length === 0 || sections.length === 0) return null;

    const latest = Math.max(...entries.map((e) => e.date));
    const amountByLineItem = new Map(
      entries
        .filter((e) => e.date === latest)
        .map((e) => [e.lineItemId, e.amount])
    );

    const total = sections.reduce((sum, section) => {
      const sectionTotal = section.lineItems.reduce(
        (inner, lineItem) => inner + (amountByLineItem.get(lineItem.id) ?? 0),
        0
      );
      return section.operation === 'subtract'
        ? sum - sectionTotal
        : sum + sectionTotal;
    }, 0);

    return { total, asOf: latest };
  }, [wealthEntriesResult, sectionsResult]);

  /** Mean monthly expense over the months that actually have spend in them. */
  const averageMonthlyExpense = useMemo(() => {
    const spent = buckets.filter((b) => b.expense > 0);
    if (spent.length === 0) return 0;
    return spent.reduce((sum, b) => sum + b.expense, 0) / spent.length;
  }, [buckets]);

  return {
    loading,
    window,
    transactions,
    categories,
    buckets,
    thisMonth,
    priority,
    merchants,
    categorySpend,
    recurring,
    burn,
    netWorth,
    averageMonthlyExpense,
  };
}
