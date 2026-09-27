import { verifyAuth } from '@/lib/auth';
import { importWealthCsv } from '@/lib/wealth-import';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const { csv } = await request.json();
    if (typeof csv !== 'string' || !csv.trim()) {
      return NextResponse.json({ error: 'csv is required' }, { status: 400 });
    }

    const result = await importWealthCsv(authPayload.userId, csv);

    return NextResponse.json(result);
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Wealth CSV import error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
