import { z } from 'zod';

export const transactionTypeSchema = z.enum(['credit', 'debit']);

// Helper function to parse date from DD/MM/YYYY format (common in Indian bank statements)
const parseDateString = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value !== 'string') {
    throw new Error('Date must be a string or Date object');
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Date is empty');
  }

  // Try DD/MM/YYYY format first (common in Indian bank statements like ICICI)
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, dayStr, monthStr, yearStr] = ddmmyyyyMatch;
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

    // If day > 12, it's definitely DD/MM/YYYY format
    // Otherwise, prioritize DD/MM/YYYY for Indian bank statements
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${trimmed}`);
    }
    return date;
  }

  // Try standard Date parsing for ISO format or other formats
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${trimmed}`);
  }
  return date;
};

export const createTransactionSchema = z.object({
  date: z.preprocess(parseDateString, z.date()),
  accountingDate: z.preprocess(parseDateString, z.date()).optional(),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  type: transactionTypeSchema,
  bankAccount: z.string().min(1, 'Bank account is required'),
  reason: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  isInternal: z.boolean().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const transactionSchema = createTransactionSchema.extend({
  id: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Transaction = z.infer<typeof transactionSchema>;

export const bulkTransactionsSchema = z.array(createTransactionSchema);

export type BulkTransactionsInput = z.infer<typeof bulkTransactionsSchema>;

export const updateTransactionSchema = createTransactionSchema.partial();

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
