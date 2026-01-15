import { verifyAuth } from '@/lib/auth';
import {
  getWealthEntriesByDateRange,
  getWealthSectionsByUserId,
} from '@kanak/api';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const { searchParams } = new URL(request.url);

    // Get date range for entries (default: last 12 months)
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      // Default to last 12 months
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
      startDate.setHours(0, 0, 0, 0);
    }

    // Get sections with line items
    const sections = await getWealthSectionsByUserId(authPayload.userId);

    // Get entries for the date range
    const entries = await getWealthEntriesByDateRange(
      authPayload.userId,
      startDate,
      endDate
    );

    return NextResponse.json({
      sections,
      entries,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Get wealth data error:', {
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
