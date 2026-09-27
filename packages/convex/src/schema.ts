import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  ...authTables,

  // authTables.users, inlined so it can carry our own fields. The table name
  // must stay `users`: ten tables hold v.id('users') and Convex ids are
  // per-table, so renaming it would orphan every row.
  users: defineTable({
    // Convex Auth's own fields.
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Ours. Optional because Convex Auth inserts users without them.
    role: v.optional(v.string()),
    // Pre-Convex-Auth bcrypt hash. Read once by the authAccounts backfill,
    // then cleared; remove this field after the backfill has run everywhere.
    password: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index('by_email', ['email']),

  transactions: defineTable({
    date: v.number(),
    accountingDate: v.number(),
    description: v.string(),
    amount: v.number(),
    type: v.string(), // "credit" or "debit"
    bankAccount: v.string(),
    reason: v.optional(v.string()),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
    isInternal: v.optional(v.boolean()),
    // Soft delete: absent or false means live. Never hard-delete transactions.
    isDeleted: v.optional(v.boolean()),
    userId: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_date', ['date'])
    .index('by_accountingDate', ['accountingDate']),

  categories: defineTable({
    title: v.string(),
    color: v.string(),
    icon: v.string(),
    description: v.optional(v.string()),
    type: v.string(), // "income", "expense", "intra-transfer", "passive-savings", "savings"
    priority: v.optional(v.string()), // "needs", "wants", "savings", "insurance", "liabilities"
    active: v.boolean(),
    userId: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_active', ['active']),

  bank_accounts: defineTable({
    name: v.string(),
    bankName: v.string(),
    accountNumber: v.optional(v.string()),
    ifscCode: v.optional(v.string()),
    branch: v.optional(v.string()),
    active: v.boolean(),
    userId: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_active', ['active']),

  transaction_rules: defineTable({
    title: v.string(),
    filter: v.any(), // GroupFilter structure
    action: v.any(), // TransactionRuleAction structure
    order: v.number(),
    userId: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_order', ['userId', 'order']),

  budgets: defineTable({
    userId: v.id('users'),
    categoryId: v.string(), // References category title
    month: v.number(), // 1-12
    year: v.number(),
    amount: v.number(),
    actual: v.optional(v.number()), // Calculated actual spending for this category/month/year
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_year_month', ['userId', 'year', 'month'])
    .index('by_userId_categoryId_year_month', [
      'userId',
      'categoryId',
      'year',
      'month',
    ]),

  wealth_sections: defineTable({
    userId: v.id('users'),
    name: v.string(),
    color: v.string(),
    operation: v.string(), // "add" or "subtract"
    order: v.number(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_deletedAt', ['userId', 'deletedAt']),

  wealth_line_items: defineTable({
    sectionId: v.id('wealth_sections'),
    userId: v.id('users'),
    name: v.string(),
    order: v.number(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_sectionId', ['sectionId'])
    .index('by_userId_deletedAt', ['userId', 'deletedAt']),

  wealth_entries: defineTable({
    lineItemId: v.id('wealth_line_items'),
    userId: v.id('users'),
    date: v.number(),
    amount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_lineItemId', ['lineItemId'])
    .index('by_date', ['date'])
    .index('by_userId_date', ['userId', 'date'])
    .index('by_userId_lineItemId_date_unique', [
      'userId',
      'lineItemId',
      'date',
    ]),

  sessions: defineTable({
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_userId', ['userId']),

  transaction_uploads: defineTable({
    userId: v.id('users'),
    storageId: v.optional(v.id('_storage')),
    fileName: v.string(),
    fileSize: v.number(),
    totalRows: v.number(),
    uploadedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),
});
