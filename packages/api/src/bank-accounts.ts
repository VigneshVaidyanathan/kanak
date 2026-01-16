import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import { CreateBankAccountInput, UpdateBankAccountInput } from '@kanak/shared';
import { getConvexClient } from './db';

// Helper to convert Convex bank account to API format
function convertBankAccountFromConvex(bankAccount: any): any {
  if (!bankAccount) return null;
  return {
    id: bankAccount._id,
    name: bankAccount.name,
    bankName: bankAccount.bankName,
    accountNumber: bankAccount.accountNumber,
    ifscCode: bankAccount.ifscCode,
    branch: bankAccount.branch,
    active: bankAccount.active,
    userId: bankAccount.userId,
    createdAt: new Date(bankAccount.createdAt),
    updatedAt: new Date(bankAccount.updatedAt),
  };
}

export async function getBankAccountsByUserId(
  userId: string,
  activeOnly: boolean = true
): Promise<any[]> {
  const convex = await getConvexClient();
  const bankAccounts = await convex.query(
    api.bankAccounts.getBankAccountsByUserId,
    {
      userId: userId as Id<'users'>,
      activeOnly,
    }
  );
  return bankAccounts.map(convertBankAccountFromConvex);
}

export async function getBankAccountById(
  id: string,
  userId: string
): Promise<any> {
  const convex = await getConvexClient();
  const bankAccount = await convex.query(api.bankAccounts.getBankAccountById, {
    id: id as Id<'bank_accounts'>,
    userId: userId as Id<'users'>,
  });
  return convertBankAccountFromConvex(bankAccount);
}

export async function createBankAccount(
  userId: string,
  input: CreateBankAccountInput
): Promise<any> {
  const convex = await getConvexClient();
  const bankAccount = await convex.mutation(
    api.bankAccounts.createBankAccount,
    {
      userId: userId as Id<'users'>,
      name: input.name,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      ifscCode: input.ifscCode,
      branch: input.branch,
      active: (input as any).active,
    }
  );
  return convertBankAccountFromConvex(bankAccount);
}

export async function updateBankAccount(
  id: string,
  userId: string,
  input: UpdateBankAccountInput
): Promise<any> {
  const convex = await getConvexClient();
  const bankAccount = await convex.mutation(
    api.bankAccounts.updateBankAccount,
    {
      id: id as Id<'bank_accounts'>,
      userId: userId as Id<'users'>,
      name: input.name,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      ifscCode: input.ifscCode,
      branch: input.branch,
      active: (input as any).active,
    }
  );
  return convertBankAccountFromConvex(bankAccount);
}

export async function deactivateBankAccount(
  id: string,
  userId: string
): Promise<any> {
  const convex = await getConvexClient();
  const bankAccount = await convex.mutation(
    api.bankAccounts.deactivateBankAccount,
    {
      id: id as Id<'bank_accounts'>,
      userId: userId as Id<'users'>,
    }
  );
  return convertBankAccountFromConvex(bankAccount);
}
