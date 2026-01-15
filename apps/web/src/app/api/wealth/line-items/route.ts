import { verifyAuth } from '@/lib/auth';
import { createWealthLineItem } from '@kanak/api';
import { createWealthLineItemSchema } from '@kanak/shared';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const body = await request.json();
    const validatedData = createWealthLineItemSchema.parse(body);

    const lineItem = await createWealthLineItem(
      authPayload.userId,
      validatedData
    );

    return NextResponse.json(lineItem);
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
    console.error('Create wealth line item error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
