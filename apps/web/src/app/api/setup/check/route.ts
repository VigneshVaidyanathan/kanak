import { countUsers } from '@kanak/api';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userCount = await countUsers();
    return NextResponse.json({ hasUsers: userCount > 0 });
  } catch (error: any) {
    console.error('Check users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
