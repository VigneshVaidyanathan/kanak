import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getTransactionRulesByUserId,
  getTransactionsByIds,
  updateTransaction,
  matchesGroupFilter,
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
    const rules = await getTransactionRulesByUserId(authPayload.userId);

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
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ transactionId: string; error: string }> = [];
    const ruleBreakdown: Record<string, { ruleTitle: string; count: number }> =
      {};

    for (const transaction of transactions) {
      let matched = false;

      // Check rules in order until we find a match
      for (const rule of rules) {
        const filter = rule.filter as unknown as GroupFilter;

        if (matchesGroupFilter(transaction as Transaction, filter)) {
          // Track rule breakdown
          if (!ruleBreakdown[rule.id]) {
            ruleBreakdown[rule.id] = {
              ruleTitle: rule.title,
              count: 0,
            };
          }
          ruleBreakdown[rule.id].count++;

          if (preview) {
            // In preview mode, just count matches without applying
            updatedCount++;
            matched = true;
            break;
          }

          // Apply rule actions
          const action = rule.action as unknown as TransactionRuleAction;
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

          // Note: tags are not stored in Transaction model yet
          // We can add this later if needed

          // Update the transaction
          try {
            await updateTransaction(
              transaction.id,
              authPayload.userId,
              updates
            );
            updatedCount++;
            matched = true;
            break; // Stop after first matching rule
          } catch (error: any) {
            errors.push({
              transactionId: transaction.id,
              error: error.message || 'Failed to update transaction',
            });
            break;
          }
        }
      }

      if (!matched) {
        skippedCount++;
      }
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
