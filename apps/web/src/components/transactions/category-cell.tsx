'use client';

import { Category, Transaction } from '@kanak/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new timeout for API call
      debounceTimeoutRef.current = setTimeout(async () => {
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
      }, 500);
    },
    [transaction.id, transaction.category, token, onUpdate]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <CategoryCombobox
      categories={categories}
      value={localCategory}
      onValueChange={handleCategoryChange}
      placeholder="Select category..."
    />
  );
}
