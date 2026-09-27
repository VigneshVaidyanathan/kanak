'use client';

import { BankAccount, Transaction } from '@kanak/shared';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
} from '@kanak/ui';
import { IconChevronDown } from '@tabler/icons-react';
import { Check } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface BankAccountCellProps {
  transaction: Transaction;
  bankAccounts: BankAccount[];
  token: string | null;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
}

export function BankAccountCell({
  transaction,
  bankAccounts,
  token,
  onUpdate,
}: BankAccountCellProps) {
  const [localBankAccount, setLocalBankAccount] = useState<string | undefined>(
    transaction.bankAccount || undefined
  );

  // Update local state when transaction data changes
  useEffect(() => {
    setLocalBankAccount(transaction.bankAccount || undefined);
  }, [transaction.bankAccount]);

  const handleBankAccountChange = useCallback(
    (accountName: string | undefined) => {
      // Update local state immediately for UI feedback
      setLocalBankAccount(accountName);

      // Set new timeout for API call
      // ponytail: no debounce — this is one discrete click.
      void (async () => {
        if (!token) {
          console.error('No authentication token available');
          setLocalBankAccount(transaction.bankAccount || undefined);
          return;
        }

        try {
          const response = await fetch(`/api/transactions/${transaction.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ bankAccount: accountName || null }),
          });

          if (response.ok) {
            const updatedTransaction = await response.json();
            onUpdate(transaction.id, updatedTransaction);
            toast.success(
              'Transaction updated successfully and bank account set to ' +
                accountName
            );
          } else {
            console.error('Failed to update transaction bank account');
            // Revert local state on error
            setLocalBankAccount(transaction.bankAccount || undefined);
            toast.error('Failed to update transaction', {
              description: 'Please try again',
            });
          }
        } catch (error) {
          console.error('Error updating transaction bank account:', error);
          // Revert local state on error
          setLocalBankAccount(transaction.bankAccount || undefined);
          toast.error('Failed to update transaction', {
            description: 'An error occurred. Please try again',
          });
        }
      })();
    },
    [transaction.id, transaction.bankAccount, token, onUpdate]
  );

  const selectedBankAccount = bankAccounts.find(
    (account) => account.name === localBankAccount
  );

  return (
    <div className="flex items-center w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-auto py-2 pl-1.5 pr-1 font-normal"
          >
            <span
              className={cn(
                'text-xs truncate',
                !selectedBankAccount && 'text-muted-foreground'
              )}
            >
              {selectedBankAccount?.name || 'Select bank account...'}
            </span>
            <IconChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {bankAccounts.map((bankAccount) => {
            const isSelected = localBankAccount === bankAccount.name;
            return (
              <DropdownMenuItem
                key={bankAccount.id}
                onClick={() => handleBankAccountChange(bankAccount.name)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="flex-1">{bankAccount.name}</span>
                {isSelected && <Check className="h-4 w-4 text-primary ml-2" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
