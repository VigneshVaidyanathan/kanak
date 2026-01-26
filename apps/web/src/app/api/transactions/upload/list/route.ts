import { verifyAuth } from '@/lib/auth';
import { getTransactionUploadsByUserId } from '@kanak/api';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);

    const uploads = await getTransactionUploadsByUserId(authPayload.userId);

    return NextResponse.json(uploads);
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Transaction uploads list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction uploads' },
      { status: 500 }
    );
  }
}
