'use client';

import { Transaction } from '@kanak/shared';
import { Switch } from '@kanak/ui';
import { cn } from '@kanak/ui/lib/utils';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface OmitCellProps {
  transaction: Transaction;
  token: string | null;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
}

export function OmitCell({ transaction, token, onUpdate }: OmitCellProps) {
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
      if (!token) {
        console.error('No authentication token available');
        setIsInternal(transaction.isInternal || false);
        return;
      }

      try {
        const response = await fetch(`/api/transactions/${transaction.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isInternal: !checked }),
        });

        if (response.ok) {
          const updatedTransaction = await response.json();
          onUpdate(transaction.id, updatedTransaction);
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update transaction');
        }
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
