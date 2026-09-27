'use client';

import { api } from '@kanak/convex/src/_generated/api';
import type { Id } from '@kanak/convex/src/_generated/dataModel';
import { Category, Transaction } from '@kanak/shared';
import { useMutation } from 'convex/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CategoryCombobox } from './category-combobox';

interface CategoryCellProps {
  transaction: Transaction;
  categories: Category[];
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
}

export function CategoryCell({
  transaction,
  categories,
  onUpdate,
}: CategoryCellProps) {
  const updateTransaction = useMutation(api.transactions.updateTransaction);
  const [localCategory, setLocalCategory] = useState<string | undefined>(
    transaction.category || undefined
  );

  // Update local state when transaction data changes
  useEffect(() => {
    setLocalCategory(transaction.category || undefined);
  }, [transaction.category]);

  const handleCategoryChange = useCallback(
    (categoryTitle: string | undefined) => {
      // Update local state immediately for UI feedback
      setLocalCategory(categoryTitle);

      // ponytail: no debounce — picking a category is one discrete click,
      // debouncing it only added latency.
      void (async () => {
        try {
          const updatedTransaction = await updateTransaction({
            id: transaction.id as Id<'transactions'>,
            category: categoryTitle || '',
          });
          onUpdate(transaction.id, updatedTransaction);
          toast.success(
            'Transaction updated successfully and category set to ' +
              categoryTitle
          );
        } catch (error) {
          console.error('Error updating transaction category:', error);
          // Revert local state on error
          setLocalCategory(transaction.category || undefined);
          toast.error('Failed to update transaction', {
            description: 'An error occurred. Please try again',
          });
        }
      })();
    },
    [transaction.id, transaction.category, updateTransaction, onUpdate]
  );

  return (
    <CategoryCombobox
      categories={categories}
      value={localCategory}
      onValueChange={handleCategoryChange}
      placeholder="Select category..."
    />
  );
}
