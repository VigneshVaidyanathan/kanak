import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import {
  getAuthedConvexClient,
  getTransactionsByUserId,
  updateTransactions,
  matchesGroupFilter,
  type BatchTransactionUpdate,
} from '@kanak/api';
import { GroupFilter, TransactionRuleAction, Transaction } from '@kanak/shared';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authPayload = await verifyAuth(request);

    // Rules come straight from Convex now; the query takes its owner from the
    // token. Applying them still runs here because it writes transactions,
    // which have not moved yet.
    const token = await convexAuthNextjsToken();
    if (!token) {
      throw new Error('No authentication token provided');
    }
    const convex = await getAuthedConvexClient(token);
    const rule = await convex.query(
      api.transactionRules.getTransactionRuleById,
      {
        id: params.id as Id<'transaction_rules'>,
      }
    );

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

    const pending: BatchTransactionUpdate[] = [];
    let skippedCount = 0;

    for (const transaction of transactions) {
      if (!matchesGroupFilter(transaction as Transaction, filter)) {
        skippedCount++;
        continue;
      }

      pending.push({
        id: transaction.id,
        notes: action.notes || undefined,
        category: action.category || undefined,
        isInternal:
          action.isInternal !== undefined
            ? action.isInternal === 'yes'
            : undefined,
      });
    }

    const { updated, failed } = await updateTransactions(
      authPayload.userId,
      pending
    );
    const updatedCount = updated.length;
    skippedCount += failed.length;
    const errors = failed.map((f) => ({
      transactionId: f.id,
      error: f.error,
    }));

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
