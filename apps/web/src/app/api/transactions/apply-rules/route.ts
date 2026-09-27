import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { api } from '@kanak/convex/src/_generated/api';
import {
  getAuthedConvexClient,
  getTransactionsByIds,
  updateTransactions,
  matchesGroupFilter,
  type BatchTransactionUpdate,
} from '@kanak/api';
import { GroupFilter, TransactionRuleAction, Transaction } from '@kanak/shared';
import { z } from 'zod';

const applyRulesSchema = z.object({
  transactionIds: z
    .array(z.string())
    .min(1, 'At least one transaction ID is required'),
  preview: z.boolean().optional().default(false),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authPayload = await verifyAuth(request);
    const body = await request.json();
    const { transactionIds, preview } = applyRulesSchema.parse(body);

    // Fetch all transaction rules for the user (ordered by priority)
    const token = await convexAuthNextjsToken();
    if (!token) {
      throw new Error('No authentication token provided');
    }
    const convex = await getAuthedConvexClient(token);
    const rules = await convex.query(
      api.transactionRules.getTransactionRulesByUserId,
      {}
    );

    if (rules.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No transaction rules found',
        updated: 0,
        skipped: transactionIds.length,
      });
    }

    // Fetch the selected transactions
    const transactions = await getTransactionsByIds(
      transactionIds,
      authPayload.userId
    );

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found' },
        { status: 404 }
      );
    }

    // Process each transaction
    let skippedCount = 0;
    const ruleBreakdown: Record<string, { ruleTitle: string; count: number }> =
      {};
    const pending: BatchTransactionUpdate[] = [];

    for (const transaction of transactions) {
      // Check rules in order and stop at the first match
      const rule = rules.find((r) =>
        matchesGroupFilter(
          transaction as Transaction,
          r.filter as unknown as GroupFilter
        )
      );

      if (!rule) {
        skippedCount++;
        continue;
      }

      if (!ruleBreakdown[rule.id]) {
        ruleBreakdown[rule.id] = { ruleTitle: rule.title, count: 0 };
      }
      ruleBreakdown[rule.id].count++;

      if (preview) continue;

      // Note: tags are not stored in Transaction model yet
      const action = rule.action as unknown as TransactionRuleAction;
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

    let updatedCount = Object.values(ruleBreakdown).reduce(
      (sum, r) => sum + r.count,
      0
    );
    let errors: Array<{ transactionId: string; error: string }> = [];

    if (!preview) {
      const { updated, failed } = await updateTransactions(
        authPayload.userId,
        pending
      );
      updatedCount = updated.length;
      skippedCount += failed.length;
      errors = failed.map((f) => ({ transactionId: f.id, error: f.error }));
    }

    return NextResponse.json({
      success: true,
      message: preview
        ? `Preview: ${updatedCount} transaction(s) would be updated`
        : `Applied rules to ${updatedCount} transaction(s)`,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      ruleBreakdown: Object.values(ruleBreakdown),
      preview,
    });
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
    console.error('Apply rules error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
