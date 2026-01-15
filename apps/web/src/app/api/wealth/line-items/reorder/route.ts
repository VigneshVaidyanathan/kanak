import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { updateWealthLineItemsOrder } from '@kanak/api';
import { z } from 'zod';

const reorderSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string(),
      order: z.number().int(),
    })
  ),
});

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const body = await request.json();
    const validatedData = reorderSchema.parse(body);

    const lineItems = await updateWealthLineItemsOrder(
      authPayload.userId,
      validatedData.updates
    );

    return NextResponse.json(lineItems);
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
    console.error('Reorder wealth line items error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
