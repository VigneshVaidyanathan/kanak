import { verifyAuth } from '@/lib/auth';
import { createWealthSection } from '@kanak/api';
import { createWealthSectionSchema } from '@kanak/shared';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const body = await request.json();
    const validatedData = createWealthSectionSchema.parse(body);

    const section = await createWealthSection(
      authPayload.userId,
      validatedData
    );

    return NextResponse.json(section);
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
    console.error('Create wealth section error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
