import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { updateTransactionRulesOrder } from '@kanak/api';
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

    const rules = await updateTransactionRulesOrder(
      authPayload.userId,
      validatedData.updates
    );

    return NextResponse.json(rules);
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (
      error.message ===
      'Some transaction rules not found or do not belong to user'
    ) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Reorder transaction rules error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
