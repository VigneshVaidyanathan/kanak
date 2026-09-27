'use client';

import { Category, Transaction } from '@kanak/shared';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CategoryCombobox } from './category-combobox';

interface CategoryCellProps {
  transaction: Transaction;
  categories: Category[];
  token: string | null;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
}

export function CategoryCell({
  transaction,
  categories,
  token,
  onUpdate,
}: CategoryCellProps) {
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
        if (!token) {
          console.error('No authentication token available');
          setLocalCategory(transaction.category || undefined);
          return;
        }

        try {
          const response = await fetch(`/api/transactions/${transaction.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ category: categoryTitle || null }),
          });

          if (response.ok) {
            const updatedTransaction = await response.json();
            onUpdate(transaction.id, updatedTransaction);
            toast.success(
              'Transaction updated successfully and category set to ' +
                categoryTitle
            );
          } else {
            console.error('Failed to update transaction category');
            // Revert local state on error
            setLocalCategory(transaction.category || undefined);
            toast.error('Failed to update transaction', {
              description: 'Please try again',
            });
          }
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
    [transaction.id, transaction.category, token, onUpdate]
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
