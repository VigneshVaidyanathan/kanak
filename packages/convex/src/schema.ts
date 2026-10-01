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
    // The workspace this user is currently looking at. Every handler reads the
    // workspace from here rather than from an argument, so switching is a
    // single patch and Convex reactivity re-runs every subscribed query.
    activeWorkspaceId: v.optional(v.id('workspaces')),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index('by_email', ['email']),

  // A workspace is a family: the unit every row of financial data belongs to.
  workspaces: defineTable({
    name: v.string(),
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Membership carries no role: being a member means full read and write on
  // that workspace's data. Add a role column when someone needs read-only.
  workspace_members: defineTable({
    workspaceId: v.id('workspaces'),
    userId: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_workspaceId', ['workspaceId'])
    .index('by_workspaceId_userId', ['workspaceId', 'userId']),

  // Every table below is scoped by `workspaceId`. `userId` is kept as the
  // creator stamp — it is written on insert and never read for scoping.
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
    workspaceId: v.optional(v.id('workspaces')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_date', ['date'])
    .index('by_accountingDate', ['accountingDate'])
    .index('by_userId_accountingDate', ['userId', 'accountingDate'])
    .index('by_userId_date', ['userId', 'date'])
    // Reads are almost always "this workspace, this date window": the
    // transactions page and budget actuals both scope by accountingDate.
    .index('by_workspaceId', ['workspaceId'])
    .index('by_workspaceId_accountingDate', ['workspaceId', 'accountingDate'])
    // Import dedupe matches on `date`, not accountingDate, so it needs its own.
    .index('by_workspaceId_date', ['workspaceId', 'date']),

  categories: defineTable({
    title: v.string(),
    color: v.string(),
    icon: v.string(),
    description: v.optional(v.string()),
    type: v.string(), // "income", "expense", "intra-transfer", "passive-savings", "savings"
    priority: v.optional(v.string()), // "needs", "wants", "savings", "insurance", "liabilities"
    active: v.boolean(),
    userId: v.id('users'),
    workspaceId: v.optional(v.id('workspaces')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_active', ['active'])
    .index('by_workspaceId', ['workspaceId']),

  bank_accounts: defineTable({
    name: v.string(),
    bankName: v.string(),
    accountNumber: v.optional(v.string()),
    ifscCode: v.optional(v.string()),
    branch: v.optional(v.string()),
    active: v.boolean(),
    userId: v.id('users'),
    workspaceId: v.optional(v.id('workspaces')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_active', ['active'])
    .index('by_workspaceId', ['workspaceId']),

  transaction_rules: defineTable({
    title: v.string(),
    filter: v.any(), // GroupFilter structure
    action: v.any(), // TransactionRuleAction structure
    order: v.number(),
    userId: v.id('users'),
    workspaceId: v.optional(v.id('workspaces')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_order', ['userId', 'order'])
    .index('by_workspaceId', ['workspaceId'])
    .index('by_workspaceId_order', ['workspaceId', 'order']),

  budgets: defineTable({
    userId: v.id('users'),
    workspaceId: v.optional(v.id('workspaces')),
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
    ])
    .index('by_workspaceId', ['workspaceId'])
    .index('by_workspaceId_year_month', ['workspaceId', 'year', 'month'])
    .index('by_workspaceId_categoryId_year_month', [
      'workspaceId',
      'categoryId',
      'year',
      'month',
    ]),

  wealth_sections: defineTable({
    userId: v.id('users'),
    workspaceId: v.optional(v.id('workspaces')),
    name: v.string(),
    color: v.string(),
    operation: v.string(), // "add" or "subtract"
    order: v.number(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_deletedAt', ['userId', 'deletedAt'])
    .index('by_workspaceId', ['workspaceId'])
    .index('by_workspaceId_deletedAt', ['workspaceId', 'deletedAt']),

  wealth_line_items: defineTable({
    sectionId: v.id('wealth_sections'),
    userId: v.id('users'),
    workspaceId: v.optional(v.id('workspaces')),
    name: v.string(),
    order: v.number(),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_sectionId', ['sectionId'])
    .index('by_userId_deletedAt', ['userId', 'deletedAt'])
    .index('by_workspaceId', ['workspaceId'])
    .index('by_workspaceId_deletedAt', ['workspaceId', 'deletedAt']),

  wealth_entries: defineTable({
    lineItemId: v.id('wealth_line_items'),
    userId: v.id('users'),
    workspaceId: v.optional(v.id('workspaces')),
    date: v.number(),
    amount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_lineItemId', ['lineItemId'])
    .index('by_date', ['date'])
    .index('by_userId_date', ['userId', 'date'])
    .index('by_userId_lineItemId_date_unique', ['userId', 'lineItemId', 'date'])
    .index('by_workspaceId', ['workspaceId'])
    .index('by_workspaceId_date', ['workspaceId', 'date'])
    .index('by_workspaceId_lineItemId_date_unique', [
      'workspaceId',
      'lineItemId',
      'date',
    ]),

  transaction_uploads: defineTable({
    userId: v.id('users'),
    workspaceId: v.optional(v.id('workspaces')),
    storageId: v.optional(v.id('_storage')),
    fileName: v.string(),
    fileSize: v.number(),
    totalRows: v.number(),
    uploadedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_workspaceId', ['workspaceId']),

  // One row per transaction changed by an update, holding the values as they
  // were just before the patch. A bulk action shares one batchId so the whole
  // action can be undone together.
  transaction_history: defineTable({
    userId: v.id('users'),
    workspaceId: v.optional(v.id('workspaces')),
    transactionId: v.id('transactions'),
    batchId: v.string(),
    source: v.string(), // "update" | "batch" | "delete"
    // Only the fields the patch touched, with their previous values. An absent
    // key means the field had no value before.
    before: v.object({
      date: v.optional(v.number()),
      accountingDate: v.optional(v.number()),
      description: v.optional(v.string()),
      amount: v.optional(v.number()),
      type: v.optional(v.string()),
      bankAccount: v.optional(v.string()),
      reason: v.optional(v.string()),
      category: v.optional(v.string()),
      notes: v.optional(v.string()),
      isInternal: v.optional(v.boolean()),
      isDeleted: v.optional(v.boolean()),
    }),
    // Field names the patch changed, so an undo knows which to clear.
    changed: v.array(v.string()),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_batchId', ['batchId'])
    .index('by_transactionId', ['transactionId'])
    .index('by_workspaceId', ['workspaceId']),

  // App preferences. Deliberately not fields on `users`: that table is Convex
  // Auth's, inlined here with its own constraints, and preferences can grow
  // without anyone having to think about auth.
  //
  // Per-user, not per-workspace: the AI model is a personal preference that
  // should follow someone between families.
  user_settings: defineTable({
    userId: v.id('users'),
    aiModel: v.optional(v.string()), // OpenRouter model id, e.g. "anthropic/claude-sonnet-5.5"
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),

  ai_chats: defineTable({
    userId: v.id('users'),
    workspaceId: v.optional(v.id('workspaces')),
    title: v.string(),
    model: v.optional(v.string()), // the model as of creation, for display
    lastMessageAt: v.number(),
    deletedAt: v.optional(v.number()), // soft delete, as wealth_sections does
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_lastMessageAt', ['userId', 'lastMessageAt'])
    .index('by_workspaceId', ['workspaceId'])
    .index('by_workspaceId_lastMessageAt', ['workspaceId', 'lastMessageAt']),

  ai_messages: defineTable({
    chatId: v.id('ai_chats'),
    userId: v.id('users'),
    workspaceId: v.optional(v.id('workspaces')),
    role: v.string(), // "user" | "assistant"
    // The part array as the chat UI holds it: text, tool-call and tool-result
    // entries, stored verbatim so a reopened chat replays its tool blocks.
    // Same call as transaction_rules.filter.
    parts: v.any(),
    createdAt: v.number(),
  })
    .index('by_chatId_createdAt', ['chatId', 'createdAt'])
    .index('by_userId', ['userId'])
    .index('by_workspaceId', ['workspaceId']),
});
