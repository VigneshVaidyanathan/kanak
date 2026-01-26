import { verifyAuth } from '@/lib/auth';
import { createTransactionUpload } from '@kanak/api';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);

    const body = await request.json();
    const { fileName, fileSize, totalRows } = body;

    if (!fileName || fileSize === undefined || totalRows === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileSize, totalRows' },
        { status: 400 }
      );
    }

    if (typeof fileSize !== 'number' || fileSize < 0) {
      return NextResponse.json(
        { error: 'fileSize must be a non-negative number' },
        { status: 400 }
      );
    }

    if (typeof totalRows !== 'number' || totalRows < 0) {
      return NextResponse.json(
        { error: 'totalRows must be a non-negative number' },
        { status: 400 }
      );
    }

    const upload = await createTransactionUpload(
      authPayload.userId,
      fileName,
      fileSize,
      totalRows
    );

    return NextResponse.json({
      success: true,
      upload,
    });
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Transaction upload record error:', error);
    return NextResponse.json(
      { error: 'Failed to record transaction upload' },
      { status: 500 }
    );
  }
}
