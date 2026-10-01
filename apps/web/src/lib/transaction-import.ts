import type { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import type { CreateTransactionInput } from '@kanak/shared';
import type { ReactMutation } from 'convex/react';

// ponytail: chunked so one CSV import stays inside Convex's per-mutation
// argument/read limits. Raise only if imports get slow again.
const UPSERT_CHUNK_SIZE = 500;

type UpsertMutation = ReactMutation<
  typeof api.transactions.upsertTransactionsBatch
>;
type UploadUrlMutation = ReactMutation<
  typeof api.transactionUploads.generateUploadUrl
>;

/**
 * Import transactions in chunks, returning how many were created vs updated.
 *
 * This loop used to run on the server, behind /api/transactions/upload/process.
 * It runs in the browser now; the chunking is what matters, not where it runs.
 */
export async function upsertTransactionsChunked(
  upsert: UpsertMutation,
  inputs: CreateTransactionInput[]
): Promise<{
  created: number;
  updated: number;
  total: number;
  ids: Id<'transactions'>[];
}> {
  let created = 0;
  let updated = 0;
  const ids: Id<'transactions'>[] = [];

  for (let i = 0; i < inputs.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = inputs.slice(i, i + UPSERT_CHUNK_SIZE).map((input) => ({
      date: input.date.getTime(),
      accountingDate: input.accountingDate?.getTime(),
      description: input.description,
      amount: input.amount,
      type: input.type,
      bankAccount: input.bankAccount,
      reason: input.reason,
      category: input.category,
      notes: input.notes,
      isInternal: input.isInternal,
    }));

    const batch = await upsert({ transactions: chunk });
    created += batch.created;
    updated += batch.updated;
    ids.push(...batch.ids);
  }

  return { created, updated, total: inputs.length, ids };
}

/**
 * Put the raw CSV in Convex file storage and return its id.
 *
 * Best-effort: a storage failure logs and returns undefined rather than
 * failing an import whose transactions already landed.
 */
export async function storeCsvFile(
  generateUploadUrl: UploadUrlMutation,
  csvContent: string
): Promise<Id<'_storage'> | undefined> {
  try {
    const uploadUrl = await generateUploadUrl({});
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: csvContent,
    });
    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }
    const { storageId } = (await response.json()) as { storageId: string };
    return storageId as Id<'_storage'>;
  } catch (error) {
    console.error('Failed to store CSV in Convex storage:', error);
    return undefined;
  }
}
