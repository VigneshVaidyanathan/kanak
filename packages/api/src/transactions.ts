import { CreateTransactionInput, UpdateTransactionInput } from '@kanak/shared';
import { getConvexClient } from './db';
import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';

// Helper to convert Date to timestamp
function dateToTimestamp(date: Date): number {
  return date.getTime();
}

// Helper to convert timestamp to Date
function timestampToDate(timestamp: number): Date {
  return new Date(timestamp);
}

// Helper to convert Convex transaction to API format
function convertTransactionFromConvex(transaction: any): any {
  if (!transaction) return null;
  return {
    id: transaction._id,
    date: timestampToDate(transaction.date),
    accountingDate: timestampToDate(transaction.accountingDate),
    description: transaction.description,
    amount: transaction.amount,
    type: transaction.type,
    bankAccount: transaction.bankAccount,
    reason: transaction.reason,
    category: transaction.category,
    notes: transaction.notes,
    isInternal: transaction.isInternal,
    userId: transaction.userId,
    createdAt: timestampToDate(transaction.createdAt),
    updatedAt: timestampToDate(transaction.updatedAt),
  };
}

export async function getTransactionsByUserId(userId: string): Promise<any[]> {
  const convex = await getConvexClient();
  const transactions = await convex.query(
    api.transactions.getTransactionsByUserId,
    {
      userId: userId as Id<'users'>,
    }
  );
  return transactions.map(convertTransactionFromConvex);
}

export async function getTransactionsByIds(
  ids: string[],
  userId: string
): Promise<any[]> {
  const convex = await getConvexClient();
  const transactions = await convex.query(
    api.transactions.getTransactionsByIds,
    {
      ids: ids as Id<'transactions'>[],
      userId: userId as Id<'users'>,
    }
  );
  return transactions
    .map(convertTransactionFromConvex)
    .filter((t) => t !== null);
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput
): Promise<any> {
  const convex = await getConvexClient();
  const transaction = await convex.mutation(
    api.transactions.createTransaction,
    {
      userId: userId as Id<'users'>,
      date: dateToTimestamp(input.date),
      accountingDate: input.accountingDate
        ? dateToTimestamp(input.accountingDate)
        : undefined,
      description: input.description,
      amount: input.amount,
      type: input.type,
      bankAccount: input.bankAccount,
      reason: input.reason,
      category: input.category,
      notes: input.notes,
      isInternal: input.isInternal,
    }
  );
  return convertTransactionFromConvex(transaction);
}

export async function createTransactions(
  userId: string,
  inputs: CreateTransactionInput[]
): Promise<any[]> {
  // Convex mutations are atomic, so we can call them in parallel
  return Promise.all(inputs.map((input) => createTransaction(userId, input)));
}

export async function findDuplicateTransaction(
  userId: string,
  date: Date,
  amount: number,
  description: string,
  type: string
): Promise<any> {
  const convex = await getConvexClient();
  const transaction = await convex.query(
    api.transactions.findDuplicateTransaction,
    {
      userId: userId as Id<'users'>,
      date: dateToTimestamp(date),
      amount,
      description,
      type,
    }
  );
  return convertTransactionFromConvex(transaction);
}

export async function upsertTransactions(
  userId: string,
  inputs: CreateTransactionInput[]
): Promise<Array<{ action: 'updated' | 'created'; transaction: any }>> {
  const results: Array<{ action: 'updated' | 'created'; transaction: any }> =
    [];

  for (const input of inputs) {
    const existing = await findDuplicateTransaction(
      userId,
      input.date,
      input.amount,
      input.description,
      input.type
    );

    if (existing) {
      const updated = await updateTransaction(existing.id, userId, input);
      results.push({ action: 'updated', transaction: updated });
    } else {
      const created = await createTransaction(userId, input);
      results.push({ action: 'created', transaction: created });
    }
  }

  return results;
}

export async function updateTransaction(
  id: string,
  userId: string,
  input: UpdateTransactionInput
): Promise<any> {
  const convex = await getConvexClient();
  const transaction = await convex.mutation(
    api.transactions.updateTransaction,
    {
      id: id as Id<'transactions'>,
      userId: userId as Id<'users'>,
      date: input.date ? dateToTimestamp(input.date) : undefined,
      accountingDate: input.accountingDate
        ? dateToTimestamp(input.accountingDate)
        : undefined,
      description: input.description,
      amount: input.amount,
      type: input.type,
      bankAccount: input.bankAccount,
      reason: input.reason,
      category: input.category,
      notes: input.notes,
      isInternal: input.isInternal,
    }
  );
  return convertTransactionFromConvex(transaction);
}

export async function deleteTransaction(
  id: string,
  userId: string
): Promise<any> {
  const convex = await getConvexClient();
  await convex.mutation(api.transactions.deleteTransaction, {
    id: id as Id<'transactions'>,
    userId: userId as Id<'users'>,
  });
  return { success: true };
}

export async function deleteTransactions(
  ids: string[],
  userId: string
): Promise<any> {
  const convex = await getConvexClient();
  await convex.mutation(api.transactions.deleteTransactions, {
    ids: ids as Id<'transactions'>[],
    userId: userId as Id<'users'>,
  });
  return { success: true };
}
