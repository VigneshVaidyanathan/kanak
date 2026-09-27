'use client';

import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import { Transaction } from '@kanak/shared';
import { Switch } from '@kanak/ui';
import { cn } from '@kanak/ui/lib/utils';
import { useMutation } from 'convex/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface OmitCellProps {
  transaction: Transaction;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
}

export function OmitCell({ transaction, onUpdate }: OmitCellProps) {
  const updateTransaction = useMutation(api.transactions.updateTransaction);
  const [isInternal, setIsInternal] = useState(transaction.isInternal || false);

  // Update local state when transaction data changes
  useEffect(() => {
    setIsInternal(transaction.isInternal || false);
  }, [transaction.isInternal]);

  const handleToggle = (checked: boolean) => {
    // Update local state immediately for UI feedback
    setIsInternal(!checked);

    // Set new timeout for API call (1 second debounce)
    // ponytail: no debounce — this is one discrete click.
    void (async () => {
      try {
        const updatedTransaction = await updateTransaction({
          id: transaction.id as Id<'transactions'>,
          isInternal: !checked,
        });
        onUpdate(transaction.id, updatedTransaction);
      } catch (error: any) {
        console.error('Error updating transaction:', error);
        toast.error(error.message || 'Failed to update transaction');
        // Revert local state on error
        setIsInternal(!checked);
      }
    })();
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        isInternal && 'opacity-80'
      )}
    >
      <Switch checked={!isInternal} onCheckedChange={handleToggle} />
    </div>
  );
}
