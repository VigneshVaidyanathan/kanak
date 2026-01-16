#!/usr/bin/env ts-node

/**
 * Migration script to transfer data from Neon (Prisma) to Convex
 *
 * Usage:
 *   npm run migrate-to-convex
 *
 * Prerequisites:
 *   - DATABASE_URL environment variable set (Neon connection)
 *   - CONVEX_URL environment variable set
 */

import { PrismaClient } from '@prisma/client';
import { ConvexHttpClient } from 'convex/browser';
import { Id } from 'convex/values';

// Helper to convert Date to timestamp
function dateToTimestamp(date: Date): number {
  return date.getTime();
}

// Helper to convert CUID string to Convex ID (we'll use the string as-is since Convex IDs are strings)
function cuidToConvexId(cuid: string): Id<any> {
  return cuid as Id<any>;
}

async function migrateUsers(
  prisma: PrismaClient,
  convex: ConvexHttpClient
): Promise<Map<string, Id<'users'>>> {
  console.log('Migrating users...');
  const users = await prisma.user.findMany();
  const userMap = new Map<string, Id<'users'>>();

  for (const user of users) {
    try {
      // Check if user already exists by email
      const existing = await convex.query('users:findUserByEmail', {
        email: user.email,
      });

      if (existing) {
        console.log(`  User ${user.email} already exists, skipping...`);
        userMap.set(user.id, existing._id);
        continue;
      }

      // Create user in Convex
      const convexUser = await convex.mutation('users:createUser', {
        email: user.email,
        name: user.name,
        password: user.password, // Password is already hashed
        role: user.role,
      });

      userMap.set(user.id, convexUser._id);
      console.log(
        `  Migrated user: ${user.email} (${user.id} -> ${convexUser._id})`
      );
    } catch (error) {
      console.error(`  Error migrating user ${user.email}:`, error);
      throw error;
    }
  }

  console.log(`✓ Migrated ${users.length} users\n`);
  return userMap;
}

async function migrateCategories(
  prisma: PrismaClient,
  convex: ConvexHttpClient,
  userMap: Map<string, Id<'users'>>
): Promise<Map<string, Id<'categories'>>> {
  console.log('Migrating categories...');
  const categories = await prisma.category.findMany();
  const categoryMap = new Map<string, Id<'categories'>>();

  for (const category of categories) {
    try {
      const userId = userMap.get(category.userId);
      if (!userId) {
        console.error(
          `  User ${category.userId} not found, skipping category ${category.id}`
        );
        continue;
      }

      const convexCategory = await convex.mutation(
        'categories:createCategory',
        {
          userId,
          title: category.title,
          color: category.color,
          icon: category.icon,
          description: category.description,
          type: category.type,
          priority: category.priority,
          active: category.active,
        }
      );

      categoryMap.set(category.id, convexCategory._id);
      console.log(`  Migrated category: ${category.title}`);
    } catch (error) {
      console.error(`  Error migrating category ${category.id}:`, error);
      throw error;
    }
  }

  console.log(`✓ Migrated ${categories.length} categories\n`);
  return categoryMap;
}

async function migrateBankAccounts(
  prisma: PrismaClient,
  convex: ConvexHttpClient,
  userMap: Map<string, Id<'users'>>
): Promise<Map<string, Id<'bank_accounts'>>> {
  console.log('Migrating bank accounts...');
  const bankAccounts = await prisma.bankAccount.findMany();
  const bankAccountMap = new Map<string, Id<'bank_accounts'>>();

  for (const bankAccount of bankAccounts) {
    try {
      const userId = userMap.get(bankAccount.userId);
      if (!userId) {
        console.error(
          `  User ${bankAccount.userId} not found, skipping bank account ${bankAccount.id}`
        );
        continue;
      }

      const convexBankAccount = await convex.mutation(
        'bankAccounts:createBankAccount',
        {
          userId,
          name: bankAccount.name,
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber,
          ifscCode: bankAccount.ifscCode,
          branch: bankAccount.branch,
          active: bankAccount.active,
        }
      );

      bankAccountMap.set(bankAccount.id, convexBankAccount._id);
      console.log(`  Migrated bank account: ${bankAccount.name}`);
    } catch (error) {
      console.error(`  Error migrating bank account ${bankAccount.id}:`, error);
      throw error;
    }
  }

  console.log(`✓ Migrated ${bankAccounts.length} bank accounts\n`);
  return bankAccountMap;
}

async function migrateTransactions(
  prisma: PrismaClient,
  convex: ConvexHttpClient,
  userMap: Map<string, Id<'users'>>
): Promise<Map<string, Id<'transactions'>>> {
  console.log('Migrating transactions...');
  const transactions = await prisma.transaction.findMany();
  const transactionMap = new Map<string, Id<'transactions'>>();

  for (const transaction of transactions) {
    try {
      const userId = userMap.get(transaction.userId);
      if (!userId) {
        console.error(
          `  User ${transaction.userId} not found, skipping transaction ${transaction.id}`
        );
        continue;
      }

      const convexTransaction = await convex.mutation(
        'transactions:createTransaction',
        {
          userId,
          date: dateToTimestamp(transaction.date),
          accountingDate: dateToTimestamp(transaction.accountingDate),
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          bankAccount: transaction.bankAccount,
          reason: transaction.reason,
          category: transaction.category,
          notes: transaction.notes,
          isInternal: transaction.isInternal,
        }
      );

      transactionMap.set(transaction.id, convexTransaction._id);
    } catch (error) {
      console.error(`  Error migrating transaction ${transaction.id}:`, error);
      throw error;
    }
  }

  console.log(`✓ Migrated ${transactions.length} transactions\n`);
  return transactionMap;
}

async function migrateTransactionRules(
  prisma: PrismaClient,
  convex: ConvexHttpClient,
  userMap: Map<string, Id<'users'>>
): Promise<Map<string, Id<'transaction_rules'>>> {
  console.log('Migrating transaction rules...');
  const rules = await prisma.transactionRule.findMany();
  const ruleMap = new Map<string, Id<'transaction_rules'>>();

  for (const rule of rules) {
    try {
      const userId = userMap.get(rule.userId);
      if (!userId) {
        console.error(
          `  User ${rule.userId} not found, skipping rule ${rule.id}`
        );
        continue;
      }

      const convexRule = await convex.mutation(
        'transactionRules:createTransactionRule',
        {
          userId,
          title: rule.title,
          filter: rule.filter as any,
          action: rule.action as any,
          order: rule.order,
        }
      );

      ruleMap.set(rule.id, convexRule._id);
      console.log(`  Migrated rule: ${rule.title}`);
    } catch (error) {
      console.error(`  Error migrating rule ${rule.id}:`, error);
      throw error;
    }
  }

  console.log(`✓ Migrated ${rules.length} transaction rules\n`);
  return ruleMap;
}

async function migrateBudgets(
  prisma: PrismaClient,
  convex: ConvexHttpClient,
  userMap: Map<string, Id<'users'>>
): Promise<void> {
  console.log('Migrating budgets...');
  const budgets = await prisma.budget.findMany();

  for (const budget of budgets) {
    try {
      const userId = userMap.get(budget.userId);
      if (!userId) {
        console.error(
          `  User ${budget.userId} not found, skipping budget ${budget.id}`
        );
        continue;
      }

      await convex.mutation('budgets:createOrUpdateBudget', {
        userId,
        categoryId: budget.categoryId,
        month: budget.month,
        year: budget.year,
        amount: budget.amount,
        note: budget.note,
      });
    } catch (error) {
      console.error(`  Error migrating budget ${budget.id}:`, error);
      throw error;
    }
  }

  console.log(`✓ Migrated ${budgets.length} budgets\n`);
}

async function migrateWealthSections(
  prisma: PrismaClient,
  convex: ConvexHttpClient,
  userMap: Map<string, Id<'users'>>
): Promise<Map<string, Id<'wealth_sections'>>> {
  console.log('Migrating wealth sections...');
  const sections = await prisma.wealthSection.findMany();
  const sectionMap = new Map<string, Id<'wealth_sections'>>();

  for (const section of sections) {
    try {
      const userId = userMap.get(section.userId);
      if (!userId) {
        console.error(
          `  User ${section.userId} not found, skipping section ${section.id}`
        );
        continue;
      }

      const convexSection = await convex.mutation(
        'wealth:createWealthSection',
        {
          userId,
          name: section.name,
          color: section.color,
          operation: section.operation,
          order: section.order,
        }
      );

      sectionMap.set(section.id, convexSection._id);
      console.log(`  Migrated section: ${section.name}`);
    } catch (error) {
      console.error(`  Error migrating section ${section.id}:`, error);
      throw error;
    }
  }

  console.log(`✓ Migrated ${sections.length} wealth sections\n`);
  return sectionMap;
}

async function migrateWealthLineItems(
  prisma: PrismaClient,
  convex: ConvexHttpClient,
  userMap: Map<string, Id<'users'>>,
  sectionMap: Map<string, Id<'wealth_sections'>>
): Promise<Map<string, Id<'wealth_line_items'>>> {
  console.log('Migrating wealth line items...');
  const lineItems = await prisma.wealthLineItem.findMany();
  const lineItemMap = new Map<string, Id<'wealth_line_items'>>();

  for (const lineItem of lineItems) {
    try {
      const userId = userMap.get(lineItem.userId);
      if (!userId) {
        console.error(
          `  User ${lineItem.userId} not found, skipping line item ${lineItem.id}`
        );
        continue;
      }

      const sectionId = sectionMap.get(lineItem.sectionId);
      if (!sectionId) {
        console.error(
          `  Section ${lineItem.sectionId} not found, skipping line item ${lineItem.id}`
        );
        continue;
      }

      const convexLineItem = await convex.mutation(
        'wealth:createWealthLineItem',
        {
          userId,
          sectionId,
          name: lineItem.name,
          order: lineItem.order,
        }
      );

      lineItemMap.set(lineItem.id, convexLineItem._id);
    } catch (error) {
      console.error(`  Error migrating line item ${lineItem.id}:`, error);
      throw error;
    }
  }

  console.log(`✓ Migrated ${lineItems.length} wealth line items\n`);
  return lineItemMap;
}

async function migrateWealthEntries(
  prisma: PrismaClient,
  convex: ConvexHttpClient,
  userMap: Map<string, Id<'users'>>,
  lineItemMap: Map<string, Id<'wealth_line_items'>>
): Promise<void> {
  console.log('Migrating wealth entries...');
  const entries = await prisma.wealthEntry.findMany();

  // Group entries by date
  const entriesByDate = new Map<string, typeof entries>();
  for (const entry of entries) {
    const dateKey = entry.date.toISOString().split('T')[0];
    if (!entriesByDate.has(dateKey)) {
      entriesByDate.set(dateKey, []);
    }
    entriesByDate.get(dateKey)!.push(entry);
  }

  for (const [dateKey, dateEntries] of entriesByDate) {
    try {
      // Group by userId
      const entriesByUser = new Map<string, typeof dateEntries>();
      for (const entry of dateEntries) {
        if (!entriesByUser.has(entry.userId)) {
          entriesByUser.set(entry.userId, []);
        }
        entriesByUser.get(entry.userId)!.push(entry);
      }

      for (const [userIdStr, userEntries] of entriesByUser) {
        const userId = userMap.get(userIdStr);
        if (!userId) {
          console.error(`  User ${userIdStr} not found, skipping entries`);
          continue;
        }

        const convexEntries = userEntries.map((entry) => {
          const lineItemId = lineItemMap.get(entry.lineItemId);
          if (!lineItemId) {
            throw new Error(`Line item ${entry.lineItemId} not found`);
          }
          return {
            lineItemId,
            amount: entry.amount,
          };
        });

        await convex.mutation('wealth:createOrUpdateWealthEntries', {
          userId,
          date: dateToTimestamp(userEntries[0].date),
          entries: convexEntries,
        });
      }
    } catch (error) {
      console.error(`  Error migrating entries for date ${dateKey}:`, error);
      throw error;
    }
  }

  console.log(`✓ Migrated ${entries.length} wealth entries\n`);
}

async function main() {
  console.log('Starting migration from Neon (Prisma) to Convex...\n');

  // Check environment variables
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  if (!process.env.CONVEX_URL) {
    throw new Error('CONVEX_URL environment variable is required');
  }

  // Initialize Prisma client
  const prisma = new PrismaClient();

  // Initialize Convex client
  const convex = new ConvexHttpClient(process.env.CONVEX_URL);

  try {
    // Migrate in order (respecting foreign key relationships)
    const userMap = await migrateUsers(prisma, convex);
    const categoryMap = await migrateCategories(prisma, convex, userMap);
    const bankAccountMap = await migrateBankAccounts(prisma, convex, userMap);
    await migrateTransactions(prisma, convex, userMap);
    await migrateTransactionRules(prisma, convex, userMap);
    await migrateBudgets(prisma, convex, userMap);
    const sectionMap = await migrateWealthSections(prisma, convex, userMap);
    const lineItemMap = await migrateWealthLineItems(
      prisma,
      convex,
      userMap,
      sectionMap
    );
    await migrateWealthEntries(prisma, convex, userMap, lineItemMap);

    console.log('✓ Migration completed successfully!');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
