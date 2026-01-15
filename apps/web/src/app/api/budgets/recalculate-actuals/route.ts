import { verifyAuth } from '@/lib/auth';
import { getConvexClient } from '@kanak/api';
import { NextRequest, NextResponse } from 'next/server';
import { Id } from 'convex/values';

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

    const convex = await getConvexClient();

    // Get all transactions for the specified month/year using accountingDate
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    // Get all transactions for the user
    const allTransactions = await convex.query(
      'transactions:getTransactionsByUserId',
      {
        userId: authPayload.userId as Id<'users'>,
      }
    );

    // Filter transactions by date range and exclude internal
    const transactions = allTransactions.filter((t: any) => {
      const accountingDate = new Date(t.accountingDate);
      return (
        accountingDate >= monthStart &&
        accountingDate <= monthEnd &&
        !t.isInternal
      );
    });

    // Get all categories for the user
    const categories = await convex.query('categories:getCategoriesByUserId', {
      userId: authPayload.userId as Id<'users'>,
      activeOnly: false,
    });

    // Create a map of category titles
    const categoryMap = new Map(categories.map((cat: any) => [cat.title, cat]));

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
        return convex.mutation('budgets:updateBudgetActual', {
          userId: authPayload.userId as Id<'users'>,
          categoryId,
          year,
          month,
          actual: actualAmount,
        });
      });

    // Also set actual to 0 for categories that have budgets but no transactions
    const existingBudgets = await convex.query(
      'budgets:getBudgetsByUserIdYearMonth',
      {
        userId: authPayload.userId as Id<'users'>,
        year,
        month,
      }
    );

    const categoriesWithTransactions = new Set(Object.keys(actualsByCategory));
    const categoriesToZero = existingBudgets.filter(
      (budget: any) => !categoriesWithTransactions.has(budget.categoryId)
    );

    const zeroPromises = categoriesToZero.map((budget: any) =>
      convex.mutation('budgets:updateBudgetActual', {
        userId: authPayload.userId as Id<'users'>,
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
