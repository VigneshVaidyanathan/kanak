import { verifyAuth } from '@/lib/auth';
import { getTransactionsByAccountingDateRange } from '@kanak/api';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');

    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    const month = monthParam ? parseInt(monthParam, 10) : undefined;

    if (year == null || month == null || isNaN(year) || isNaN(month)) {
      return NextResponse.json(
        { error: 'Year and month query params are required' },
        { status: 400 }
      );
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    const transactions = await getTransactionsByAccountingDateRange(
      authPayload.userId,
      monthStart,
      monthEnd
    );

    return NextResponse.json(transactions);
  } catch (error: unknown) {
    const err = error as { message?: string };
    if (
      err.message === 'No authentication token provided' ||
      err.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('Get transactions by month error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
