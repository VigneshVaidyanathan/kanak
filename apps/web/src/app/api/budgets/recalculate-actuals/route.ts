import { verifyAuth } from '@/lib/auth';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import {
  getAuthedConvexClient,
  getTransactionsByAccountingDateRange,
} from '@kanak/api';
import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const body = await request.json();
    const { year, month } = body;

    if (!year || !month) {
      return NextResponse.json(
        { error: 'Year and month are required' },
        { status: 400 }
      );
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    // Get transactions for the month by accounting date via APIs package
    const transactions = await getTransactionsByAccountingDateRange(
      authPayload.userId,
      monthStart,
      monthEnd
    );

    // Categories come straight from Convex now; the query takes its owner from
    // the token rather than a userId argument.
    const token = await convexAuthNextjsToken();
    if (!token) {
      throw new Error('No authentication token provided');
    }
    const authedConvex = await getAuthedConvexClient(token);
    const categories = await authedConvex.query(
      api.categories.getCategoriesByUserId,
      { activeOnly: false }
    );

    const categoryMap = new Map(
      categories.map((cat: { title: string }) => [cat.title, cat])
    );

    // Calculate actuals by category
    const actualsByCategory: Record<string, number> = {};

    transactions.forEach((transaction: any) => {
      const categoryId = transaction.category || '__NO_CATEGORY__';
      const amount = Number(transaction.amount);
      // Debit increases spending, credit decreases spending
      const contribution = transaction.type === 'debit' ? amount : -amount;

      if (!actualsByCategory[categoryId]) {
        actualsByCategory[categoryId] = 0;
      }
      actualsByCategory[categoryId] += contribution;
    });

    // Update budgets with calculated actuals
    const updatePromises = Object.entries(actualsByCategory)
      .filter(([categoryId]: [string, number]) => {
        // Only update if category exists (skip __NO_CATEGORY__)
        return categoryId !== '__NO_CATEGORY__' && categoryMap.has(categoryId);
      })
      .map(async ([categoryId, actual]: [string, number]) => {
        // Use absolute value for actual spending
        const actualAmount = Math.abs(actual);

        // Update or create budget with actual using Convex mutation
        return authedConvex.mutation(api.budgets.updateBudgetActual, {
          categoryId,
          year,
          month,
          actual: actualAmount,
        });
      });

    // Also set actual to 0 for categories that have budgets but no transactions
    const existingBudgets = await authedConvex.query(
      api.budgets.getBudgetsByUserId,
      { year, month }
    );

    const categoriesWithTransactions = new Set(Object.keys(actualsByCategory));
    const categoriesToZero = existingBudgets.filter(
      (budget: any) => !categoriesWithTransactions.has(budget.categoryId)
    );

    const zeroPromises = categoriesToZero.map((budget: any) =>
      authedConvex.mutation(api.budgets.updateBudgetActual, {
        categoryId: budget.categoryId,
        year,
        month,
        actual: 0,
      })
    );

    await Promise.all([...updatePromises, ...zeroPromises]);

    return NextResponse.json({
      success: true,
      message: 'Actuals recalculated successfully',
    });
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Recalculate actuals error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
