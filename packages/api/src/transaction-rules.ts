import {
  CreateTransactionRuleInput,
  UpdateTransactionRuleInput,
} from '@kanak/shared';
import { getConvexClient } from './db';
import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';

// Helper to convert Convex transaction rule to API format
function convertTransactionRuleFromConvex(rule: any): any {
  if (!rule) return null;
  return {
    id: rule._id,
    title: rule.title,
    filter: rule.filter,
    action: rule.action,
    order: rule.order,
    userId: rule.userId,
    createdAt: new Date(rule.createdAt),
    updatedAt: new Date(rule.updatedAt),
  };
}

export async function getTransactionRulesByUserId(
  userId: string
): Promise<any[]> {
  const convex = await getConvexClient();
  const rules = await convex.query(
    api.transactionRules.getTransactionRulesByUserId,
    {
      userId: userId as Id<'users'>,
    }
  );
  return rules.map(convertTransactionRuleFromConvex);
}

export async function getTransactionRuleById(
  id: string,
  userId: string
): Promise<any> {
  const convex = await getConvexClient();
  const rule = await convex.query(api.transactionRules.getTransactionRuleById, {
    id: id as Id<'transaction_rules'>,
    userId: userId as Id<'users'>,
  });
  return convertTransactionRuleFromConvex(rule);
}

export async function createTransactionRule(
  userId: string,
  input: CreateTransactionRuleInput & { order?: number }
): Promise<any> {
  const convex = await getConvexClient();
  const rule = await convex.mutation(
    api.transactionRules.createTransactionRule,
    {
      userId: userId as Id<'users'>,
      title: input.title,
      filter: input.filter,
      action: input.action,
      order: input.order,
    }
  );
  return convertTransactionRuleFromConvex(rule);
}

export async function updateTransactionRule(
  id: string,
  userId: string,
  input: UpdateTransactionRuleInput
): Promise<any> {
  const convex = await getConvexClient();
  const rule = await convex.mutation(
    api.transactionRules.updateTransactionRule,
    {
      id: id as Id<'transaction_rules'>,
      userId: userId as Id<'users'>,
      title: input.title,
      filter: input.filter,
      action: input.action,
      order: input.order,
    }
  );
  return convertTransactionRuleFromConvex(rule);
}

export async function deleteTransactionRule(
  id: string,
  userId: string
): Promise<any> {
  const convex = await getConvexClient();
  const deletedRule = await convex.mutation(
    api.transactionRules.deleteTransactionRule,
    {
      id: id as Id<'transaction_rules'>,
      userId: userId as Id<'users'>,
    }
  );
  return convertTransactionRuleFromConvex(deletedRule);
}

export async function updateTransactionRulesOrder(
  userId: string,
  updates: Array<{ id: string; order: number }>
): Promise<any[]> {
  const convex = await getConvexClient();
  const rules = await convex.mutation(
    api.transactionRules.updateTransactionRulesOrder,
    {
      userId: userId as Id<'users'>,
      updates: updates.map((u) => ({
        id: u.id as Id<'transaction_rules'>,
        order: u.order,
      })),
    }
  );
  return rules.map(convertTransactionRuleFromConvex);
}
