import { verifyAuth } from '@/lib/auth';
import { updateWealthSection, softDeleteWealthSection } from '@kanak/api';
import { updateWealthSectionSchema } from '@kanak/shared';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authPayload = await verifyAuth(request);
    const body = await request.json();
    const validatedData = updateWealthSectionSchema.parse(body);

    const updated = await updateWealthSection(
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
    if (error.message === 'Wealth section not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('Update wealth section error:', error);
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

    await softDeleteWealthSection(authPayload.userId, params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === 'Wealth section not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('Delete wealth section error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
