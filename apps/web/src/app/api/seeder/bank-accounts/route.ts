import { verifyAuth } from '@/lib/auth';
import { createBankAccount } from '@kanak/api';
import { CreateBankAccountInput } from '@kanak/shared';
import { NextRequest, NextResponse } from 'next/server';

// Bank account mappings: [accountName, bankName]
const bankAccountMappings: Array<[string, string]> = [
  ['Vignesh - Canara', 'Canara Bank'],
  ['Vignesh - Axis', 'Axis Bank'],
  ['Vignesh - HDFC', 'HDFC Bank'],
  ['Vignesh - CUB', 'City Union Bank'],
  ['Vignesh - ICICI', 'ICICI Bank'],
  ['Vidhya - CUB', 'City Union Bank'],
  ['Vidhya - Axis bank', 'Axis Bank'],
];

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const userId = authPayload.userId;

    const results: Array<{
      success: boolean;
      account: string;
      userId?: string;
      error?: string;
    }> = [];
    const errors: Array<{ account: string; error: string }> = [];

    for (const [accountName, bankName] of bankAccountMappings) {
      try {
        const bankAccountData: CreateBankAccountInput = {
          name: accountName,
          bankName: bankName,
        };

        const bankAccount = await createBankAccount(userId, bankAccountData);
        results.push({
          success: true,
          account: bankAccount.name,
          userId: userId,
        });
      } catch (error: any) {
        // Skip if bank account already exists (duplicate)
        if (error.code === 'P2002') {
          results.push({
            success: false,
            account: accountName,
            error: 'Already exists',
          });
        } else {
          errors.push({ account: accountName, error: error.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      created: results.filter((r: { success: boolean }) => r.success).length,
      skipped: results.filter((r: { success: boolean }) => !r.success).length,
      errors: errors.length > 0 ? errors : undefined,
      results,
    });
  } catch (error: any) {
    if (
      error.message === 'No authentication token provided' ||
      error.message === 'Invalid or expired token'
    ) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Seed bank accounts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
