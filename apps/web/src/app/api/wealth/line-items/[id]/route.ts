import { verifyAuth } from '@/lib/auth';
import { updateWealthLineItem, softDeleteWealthLineItem } from '@kanak/api';
import { updateWealthLineItemSchema } from '@kanak/shared';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authPayload = await verifyAuth(request);
    const body = await request.json();
    const validatedData = updateWealthLineItemSchema.parse(body);

    const updated = await updateWealthLineItem(
      authPayload.userId,
      params.id,
      validatedData
    );

    return NextResponse.json(updated);
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
    if (
      error.message === 'Wealth line item not found' ||
      error.message === 'Wealth section not found'
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('Update wealth line item error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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

    await softDeleteWealthLineItem(authPayload.userId, params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === 'Wealth line item not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('Delete wealth line item error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
