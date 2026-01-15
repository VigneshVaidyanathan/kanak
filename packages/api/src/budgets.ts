import { CreateBudgetInput } from '@kanak/shared';
import type { Id } from 'convex/server';
import { getConvexClient } from './db';

// Helper to convert Convex budget to API format
function convertBudgetFromConvex(budget: any): any {
  if (!budget) return null;
  return {
    id: budget._id,
    userId: budget.userId,
    categoryId: budget.categoryId,
    month: budget.month,
    year: budget.year,
    amount: budget.amount,
    actual: budget.actual,
    note: budget.note,
    createdAt: new Date(budget.createdAt),
    updatedAt: new Date(budget.updatedAt),
  };
}

export async function getBudgetsByUserId(
  userId: string,
  year?: number,
  month?: number
): Promise<any[]> {
  const convex = await getConvexClient();
  const budgets = await (convex.query as any)('budgets:getBudgetsByUserId', {
    userId: userId as Id<'users'>,
    year,
    month,
  });
  return budgets.map(convertBudgetFromConvex);
}

export async function getBudgetByCategory(
  userId: string,
  categoryId: string,
  year: number,
  month: number
): Promise<any> {
  const convex = await getConvexClient();
  const budget = await (convex.query as any)('budgets:getBudgetByCategory', {
    userId: userId as Id<'users'>,
    categoryId,
    year,
    month,
  });
  return convertBudgetFromConvex(budget);
}

export async function createOrUpdateBudget(
  userId: string,
  input: CreateBudgetInput
): Promise<any> {
  const convex = await getConvexClient();
  const budget = await (convex.mutation as any)(
    'budgets:createOrUpdateBudget',
    {
      userId: userId as Id<'users'>,
      categoryId: input.categoryId,
      month: input.month,
      year: input.year,
      amount: input.amount,
      note: input.note,
    }
  );
  return convertBudgetFromConvex(budget);
}

export async function deleteBudget(id: string, userId: string): Promise<any> {
  const convex = await getConvexClient();
  await (convex.mutation as any)('budgets:deleteBudget', {
    id: id as Id<'budgets'>,
    userId: userId as Id<'users'>,
  });
  return { success: true };
}
