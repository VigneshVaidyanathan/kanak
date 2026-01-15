import { z } from 'zod';

// Filter comparison operators
export const filterComparisonOperatorSchema = z.enum([
  'contains',
  'equals',
  'startsWith',
  'endsWith',
  'greaterThan',
  'lessThan',
  'greaterThanOrEqual',
  'lessThanOrEqual',
  'notEquals',
]);

export type FilterComparisonOperator = z.infer<
  typeof filterComparisonOperatorSchema
>;

// Group filter operators
export const groupFilterOperatorSchema = z.enum(['and', 'or']);

export type GroupFilterOperator = z.infer<typeof groupFilterOperatorSchema>;

// Filter field types
export const filterFieldTypeSchema = z.enum([
  'date',
  'amount',
  'description',
  'category',
  'type',
  'bankAccount',
]);

export type FilterFieldType = z.infer<typeof filterFieldTypeSchema>;

// Filter field type definitions
export type FilterFieldTypeDef = {
  label: string;
  value: FilterFieldType;
  type: 'date' | 'text' | 'number';
};

export const TRANSACTION_FILTERABLE_COLUMNS: FilterFieldTypeDef[] = [
  {
    label: 'Date',
    value: 'date',
    type: 'date',
  },
  {
    label: 'Amount',
    value: 'amount',
    type: 'number',
  },
  {
    label: 'Description',
    value: 'description',
    type: 'text',
  },
  {
    label: 'Category',
    value: 'category',
    type: 'text',
  },
  {
    label: 'Transaction Type',
    value: 'type',
    type: 'text',
  },
  {
    label: 'Bank Account',
    value: 'bankAccount',
    type: 'text',
  },
];

// Filter operator options
export const FILTER_OPERATOR_OPTIONS: Array<{
  label: string;
  value: FilterComparisonOperator;
}> = [
  { label: 'Contains', value: 'contains' },
  { label: 'Equals', value: 'equals' },
  { label: 'Starts with', value: 'startsWith' },
  { label: 'Ends with', value: 'endsWith' },
  { label: 'Greater than', value: 'greaterThan' },
  { label: 'Less than', value: 'lessThan' },
  { label: 'Greater than or equal', value: 'greaterThanOrEqual' },
  { label: 'Less than or equal', value: 'lessThanOrEqual' },
  { label: 'Not equals', value: 'notEquals' },
];

// Group filter operator options
export const GROUP_FILTER_OPERATOR_OPTIONS: Array<{
  label: string;
  value: GroupFilterOperator;
}> = [
  { label: 'And', value: 'and' },
  { label: 'Or', value: 'or' },
];

// Individual filter schema
export const filterSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: filterComparisonOperatorSchema,
  value: z.string(),
});

export type Filter = z.infer<typeof filterSchema>;

// Group filter schema (recursive)
export const groupFilterSchema: z.ZodType<GroupFilter> = z.lazy(() =>
  z.object({
    id: z.string(),
    operator: groupFilterOperatorSchema,
    filters: z.array(filterSchema).optional(),
    groups: z.array(groupFilterSchema).optional(),
  })
);

export type GroupFilter = {
  id: string;
  operator: GroupFilterOperator;
  filters?: Filter[];
  groups?: GroupFilter[];
};

// Transaction rule action schema
export const transactionRuleActionSchema = z.object({
  category: z.string().optional(),
  isInternal: z.enum(['yes', 'no']).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type TransactionRuleAction = z.infer<typeof transactionRuleActionSchema>;

// Transaction rule schema
export const createTransactionRuleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  filter: z.any(), // GroupFilter - using any for recursive JSON structure
  action: transactionRuleActionSchema,
});

export type CreateTransactionRuleInput = z.infer<
  typeof createTransactionRuleSchema
>;

export const transactionRuleSchema = createTransactionRuleSchema.extend({
  id: z.string(),
  userId: z.string(),
  order: z.number().int().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TransactionRule = z.infer<typeof transactionRuleSchema>;

export const updateTransactionRuleSchema = createTransactionRuleSchema
  .partial()
  .extend({
    order: z.number().int().optional(),
  });

export type UpdateTransactionRuleInput = z.infer<
  typeof updateTransactionRuleSchema
>;
