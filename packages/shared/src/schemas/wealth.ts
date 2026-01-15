import { z } from 'zod';

// Wealth Section Schemas
export const createWealthSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .optional(),
  operation: z.enum(['add', 'subtract']).optional().default('add'),
  order: z.number().int().min(0).optional(),
});

export type CreateWealthSectionInput = z.infer<
  typeof createWealthSectionSchema
>;

export const updateWealthSectionSchema = createWealthSectionSchema.partial();

export type UpdateWealthSectionInput = z.infer<
  typeof updateWealthSectionSchema
>;

export const wealthSectionSchema = createWealthSectionSchema.extend({
  id: z.string(),
  userId: z.string(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WealthSection = z.infer<typeof wealthSectionSchema>;

// Wealth Line Item Schemas
export const createWealthLineItemSchema = z.object({
  sectionId: z.string().min(1, 'Section ID is required'),
  name: z.string().min(1, 'Line item name is required'),
  order: z.number().int().min(0).optional(),
});

export type CreateWealthLineItemInput = z.infer<
  typeof createWealthLineItemSchema
>;

export const updateWealthLineItemSchema = createWealthLineItemSchema.partial();

export type UpdateWealthLineItemInput = z.infer<
  typeof updateWealthLineItemSchema
>;

export const wealthLineItemSchema = createWealthLineItemSchema.extend({
  id: z.string(),
  userId: z.string(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WealthLineItem = z.infer<typeof wealthLineItemSchema>;

// Wealth Entry Schemas
const parseDateString = (val: unknown): Date => {
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Try ISO format first
    const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
    if (isoMatch) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) return date;
    }
    // Try other common formats
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) return date;
    throw new Error(`Invalid date format: ${trimmed}`);
  }
  throw new Error(`Invalid date: ${val}`);
};

export const createWealthEntrySchema = z.object({
  lineItemId: z.string().min(1, 'Line item ID is required'),
  date: z.preprocess(parseDateString, z.date()),
  amount: z.number().min(0, 'Amount must be non-negative'),
});

export type CreateWealthEntryInput = z.infer<typeof createWealthEntrySchema>;

export const createWealthEntriesSchema = z.object({
  date: z.preprocess(parseDateString, z.date()),
  entries: z.array(
    z.object({
      lineItemId: z.string().min(1, 'Line item ID is required'),
      amount: z.number().min(0, 'Amount must be non-negative'),
    })
  ),
});

export type CreateWealthEntriesInput = z.infer<
  typeof createWealthEntriesSchema
>;

export const wealthEntrySchema = createWealthEntrySchema.extend({
  id: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WealthEntry = z.infer<typeof wealthEntrySchema>;
