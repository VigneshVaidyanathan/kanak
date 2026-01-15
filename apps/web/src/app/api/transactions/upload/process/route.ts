import { verifyAuth } from '@/lib/auth';
import { upsertTransactions } from '@kanak/api';
import { bulkTransactionsSchema } from '@kanak/shared';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);

    const body = await request.json();
    const validatedData = bulkTransactionsSchema.parse(body.transactions);

    if (validatedData.length === 0) {
      return NextResponse.json(
        { error: 'No valid transactions found' },
        { status: 400 }
      );
    }

    const results = await upsertTransactions(authPayload.userId, validatedData);

    const created = results.filter(
      (r: { action: string }) => r.action === 'created'
    ).length;
    const updated = results.filter(
      (r: { action: string }) => r.action === 'updated'
    ).length;

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: validatedData.length,
    });
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('CSV process error:', error);
    return NextResponse.json(
      { error: 'Failed to process CSV file' },
      { status: 500 }
    );
  }
}
