import { verifyAuth } from '@/lib/auth';
import {
  getWealthEntriesByDate,
  createOrUpdateWealthEntries,
} from '@kanak/api';
import { createWealthEntriesSchema } from '@kanak/shared';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const { searchParams } = new URL(request.url);

    const dateParam = searchParams.get('date');
    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    const entries = await getWealthEntriesByDate(authPayload.userId, date);

    return NextResponse.json(entries);
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Get wealth entries error:', {
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
    const validatedData = createWealthEntriesSchema.parse(body);

    const entries = await createOrUpdateWealthEntries(
      authPayload.userId,
      validatedData
    );

    return NextResponse.json(entries);
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
    console.error('Create/Update wealth entries error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
