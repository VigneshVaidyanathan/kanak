import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getTransactionRuleById,
  updateTransactionRule,
  deleteTransactionRule,
} from '@kanak/api';
import { updateTransactionRuleSchema } from '@kanak/shared';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authPayload = await verifyAuth(request);
    const rule = await getTransactionRuleById(params.id, authPayload.userId);

    if (!rule) {
      return NextResponse.json(
        { error: 'Transaction rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rule);
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Get transaction rule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authPayload = await verifyAuth(request);
    const body = await request.json();
    const validatedData = updateTransactionRuleSchema.parse(body);

    const rule = await updateTransactionRule(
      params.id,
      authPayload.userId,
      validatedData
    );

    return NextResponse.json(rule);
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === 'Transaction rule not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Update transaction rule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authPayload = await verifyAuth(request);
    await deleteTransactionRule(params.id, authPayload.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === 'Transaction rule not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('Delete transaction rule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
