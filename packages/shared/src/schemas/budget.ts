import { z } from 'zod';

export const createBudgetSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  month: z.number().int().min(1).max(12, 'Month must be between 1 and 12'),
  year: z.number().int().min(2000).max(2100, 'Year must be valid'),
  amount: z.number().min(0, 'Amount must be non-negative'),
  note: z.string().optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const updateBudgetSchema = createBudgetSchema.partial();

export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

export const budgetSchema = createBudgetSchema.extend({
  id: z.string(),
  userId: z.string(),
  actual: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Budget = z.infer<typeof budgetSchema>;
