import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getCategoriesByUserId, createCategory } from '@kanak/api';
import { createCategorySchema } from '@kanak/shared';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const categories = await getCategoriesByUserId(authPayload.userId, true);

    return NextResponse.json(categories);
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Log more detailed error information
    console.error('Get categories error:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
    });

    // Provide more specific error messages
    const errorMessage =
      error.code === 'P1001' || error.code === 'P1002' || error.code === 'P1003'
        ? 'Database connection error. Please check your database configuration.'
        : error.message || 'Internal server error';

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);

    const category = await createCategory(authPayload.userId, validatedData);

    return NextResponse.json(category);
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
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
