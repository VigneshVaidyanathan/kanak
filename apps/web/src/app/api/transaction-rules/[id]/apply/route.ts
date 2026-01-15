import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getTransactionRuleById,
  getTransactionsByUserId,
  updateTransaction,
  matchesGroupFilter,
} from '@kanak/api';
import { GroupFilter, TransactionRuleAction, Transaction } from '@kanak/shared';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authPayload = await verifyAuth(request);

    // Get the rule
    const rule = await getTransactionRuleById(params.id, authPayload.userId);

    if (!rule) {
      return NextResponse.json(
        { error: 'Transaction rule not found' },
        { status: 404 }
      );
    }

    // Get all transactions for the user
    const transactions = await getTransactionsByUserId(authPayload.userId);

    if (transactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No transactions found',
        updated: 0,
        skipped: 0,
      });
    }

    // Apply the rule to all transactions
    const filter = rule.filter as unknown as GroupFilter;
    const action = rule.action as unknown as TransactionRuleAction;

    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ transactionId: string; error: string }> = [];

    for (const transaction of transactions) {
      if (matchesGroupFilter(transaction as Transaction, filter)) {
        // Apply rule actions
        const updates: Record<string, any> = {};

        // Apply notes if provided
        if (action.notes) {
          updates.notes = action.notes;
        }

        // Apply isInternal flag if provided
        if (action.isInternal !== undefined) {
          updates.isInternal = action.isInternal === 'yes';
        }

        // Apply category if provided
        if (action.category) {
          updates.category = action.category;
        }

        // Update the transaction
        try {
          await updateTransaction(transaction.id, authPayload.userId, updates);
          updatedCount++;
        } catch (error: any) {
          errors.push({
            transactionId: transaction.id,
            error: error.message || 'Failed to update transaction',
          });
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Applied rule to ${updatedCount} transaction(s)`,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
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
    console.error('Apply rule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
