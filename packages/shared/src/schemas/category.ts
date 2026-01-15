import { z } from 'zod';

export const categoryTypeSchema = z.enum([
  'income',
  'expense',
  'intra-transfer',
  'passive-savings',
  'savings',
]);

export const categoryPrioritySchema = z.enum([
  'needs',
  'wants',
  'savings',
  'insurance',
  'liabilities',
]);

export const createCategorySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color'),
  icon: z.string().min(1, 'Icon is required'),
  description: z.string().optional(),
  type: categoryTypeSchema,
  priority: categoryPrioritySchema.optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categorySchema = createCategorySchema.extend({
  id: z.string(),
  userId: z.string(),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Category = z.infer<typeof categorySchema>;
