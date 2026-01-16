import { countUsers, createUser } from '@kanak/api';
import { setupSchema } from '@kanak/shared';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if users already exist
    const userCount = await countUsers();
    if (userCount > 0) {
      return NextResponse.json(
        {
          error:
            'Setup is already complete. Users already exist in the system.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = setupSchema.parse(body);

    // Derive name from email (part before @)
    const name = validatedData.email.split('@')[0] || 'User';

    const user = await createUser({
      email: validatedData.email,
      name: name,
      password: validatedData.password,
      role: 'admin',
    });

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    // Check for duplicate email error
    if (
      error.message?.includes('already exists') ||
      error.message?.includes('duplicate')
    ) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    console.error('Setup create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
