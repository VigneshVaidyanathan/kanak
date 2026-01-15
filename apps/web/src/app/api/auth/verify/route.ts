import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@kanak/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const decoded = await verifyToken(token);

    return NextResponse.json({
      valid: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Invalid or expired token', valid: false },
      { status: 401 }
    );
  }
}
