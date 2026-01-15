import { verifyAuth } from '@/lib/auth';
import { createOrUpdateBudget, getBudgetsByUserId } from '@kanak/api';
import { createBudgetSchema } from '@kanak/shared';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const { searchParams } = new URL(request.url);

    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const categoryIdParam = searchParams.get('categoryId');
    const monthsParam = searchParams.get('months'); // Number of months to fetch

    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    const month = monthParam ? parseInt(monthParam, 10) : undefined;
    const categoryId = categoryIdParam || undefined;
    const months = monthsParam ? parseInt(monthsParam, 10) : undefined;

    // If categoryId and months are provided, fetch history for that category
    if (categoryId && year && month && months) {
      const budgets: (Awaited<ReturnType<typeof getBudgetsByUserId>>[number] & {
        month: number;
        year: number;
      })[] = [];
      for (let i = 1; i <= months; i++) {
        let targetYear = year;
        let targetMonth = month - i;

        // Handle year rollover
        while (targetMonth < 1) {
          targetMonth += 12;
          targetYear -= 1;
        }

        const monthBudgets = await getBudgetsByUserId(
          authPayload.userId,
          targetYear,
          targetMonth
        );

        // Find budget for this category
        const categoryBudget = monthBudgets.find(
          (b) => b.categoryId === categoryId
        );

        if (categoryBudget) {
          budgets.push({
            ...categoryBudget,
            month: targetMonth,
            year: targetYear,
          });
        }
      }

      return NextResponse.json(budgets);
    }

    const budgets = await getBudgetsByUserId(authPayload.userId, year, month);

    return NextResponse.json(budgets);
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Get budgets error:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    });

    const errorMessage =
      error.code === 'P1001' || error.code === 'P1002' || error.code === 'P1003'
        ? 'Database connection error. Please check your database configuration.'
        : error.message || 'Internal server error';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const body = await request.json();
    const validatedData = createBudgetSchema.parse(body);

    const budget = await createOrUpdateBudget(
      authPayload.userId,
      validatedData
    );

    return NextResponse.json(budget);
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Create/Update budget error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
