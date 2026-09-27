import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { getAuthedConvexClient } from '@kanak/api';
import { api } from '@kanak/convex/src/_generated/api';
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
    const token = await convexAuthNextjsToken();
    if (!token) {
      throw new Error('No authentication token provided');
    }
    // The mutation takes the owner from the token, so the seeder can only ever
    // write to the account of whoever is signed in.
    const convex = await getAuthedConvexClient(token);

    const results: Array<{
      success: boolean;
      account: string;
      error?: string;
    }> = [];
    const errors: Array<{ account: string; error: string }> = [];

    for (const [accountName, bankName] of bankAccountMappings) {
      try {
        const bankAccount = await convex.mutation(
          api.bankAccounts.createBankAccount,
          { name: accountName, bankName }
        );
        results.push({ success: true, account: bankAccount.name });
      } catch (error: any) {
        errors.push({ account: accountName, error: error.message });
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
