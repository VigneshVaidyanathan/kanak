import { z } from 'zod';

export const createBankAccountSchema = z.object({
  name: z.string().min(1, 'Bank account name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  branch: z.string().optional(),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;

export const updateBankAccountSchema = createBankAccountSchema.partial();

export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;

export const bankAccountSchema = createBankAccountSchema.extend({
  id: z.string(),
  userId: z.string(),
  active: z.boolean(),
  // Epoch milliseconds, as Convex stores and returns them.
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type BankAccount = z.infer<typeof bankAccountSchema>;
