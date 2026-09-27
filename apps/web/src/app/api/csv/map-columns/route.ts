import { verifyAuth } from '@/lib/auth';
import { suggestCsvColumnMapping } from '@kanak/api';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await verifyAuth(request);

    const { headers, rows, properties } = await request.json();
    if (!Array.isArray(headers) || !Array.isArray(properties)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const result = await suggestCsvColumnMapping(
      headers,
      Array.isArray(rows) ? rows : [],
      properties
    );

    return NextResponse.json(result);
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message?.includes('Auto-mapping is not configured')) {
      return NextResponse.json(
        { error: 'Auto-mapping is not configured' },
        {
          status: 503,
        }
      );
    }
    console.error('CSV auto-map error:', error);
    return NextResponse.json(
      { error: 'Could not auto-map columns' },
      { status: 500 }
    );
  }
}
