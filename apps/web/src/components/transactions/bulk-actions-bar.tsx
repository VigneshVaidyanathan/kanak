'use client';

import type { BankAccount, Category, Transaction } from '@kanak/shared';
import { Button, Switch } from '@kanak/ui';
import { IconEdit, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { BankAccountCombobox } from './bank-account-combobox';
import { CategoryCombobox } from './category-combobox';

export interface BulkEdits {
  category?: string;
  bankAccount?: string;
  isInternal?: boolean;
}

interface BulkActionsBarProps {
  selected: Transaction[];
  categories: Category[];
  bankAccounts: BankAccount[];
  isApplying: boolean;
  onApply: (edits: BulkEdits) => void;
  onApplyRules: () => void;
  onClear: () => void;
}

export function BulkActionsBar({
  selected,
  categories,
  bankAccounts,
  isApplying,
  onApply,
  onApplyRules,
  onClear,
}: BulkActionsBarProps) {
  const [category, setCategory] = useState<string | undefined>();
  const [bankAccount, setBankAccount] = useState<string | undefined>();
  // undefined = leave the toggle alone, true/false = set it on every row.
  const [isInternal, setIsInternal] = useState<boolean | undefined>();

  // A new selection starts from a clean slate.
  useEffect(() => {
    if (selected.length === 0) {
      setCategory(undefined);
      setBankAccount(undefined);
      setIsInternal(undefined);
    }
  }, [selected.length]);

  if (selected.length < 2) return null;

  const edits: BulkEdits = {
    ...(category !== undefined && { category }),
    ...(bankAccount !== undefined && { bankAccount }),
    ...(isInternal !== undefined && { isInternal }),
  };
  const hasEdits = Object.keys(edits).length > 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 shadow-lg">
        <span className="text-sm font-medium whitespace-nowrap">
          {selected.length} items selected
        </span>

        <div className="h-6 w-px bg-border" />

        <div className="w-[200px]">
          <CategoryCombobox
            categories={categories}
            value={category}
            onValueChange={setCategory}
            placeholder="Category"
          />
        </div>

        <div className="w-[200px]">
          <BankAccountCombobox
            bankAccounts={bankAccounts}
            value={bankAccount}
            onValueChange={setBankAccount}
            placeholder="Bank account"
          />
        </div>

        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <Switch
            checked={isInternal ?? false}
            onCheckedChange={setIsInternal}
          />
          Exclude from reports
        </label>

        <Button variant="outline" size="sm" onClick={onApplyRules}>
          <IconEdit className="h-4 w-4" />
          Apply rules
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button
          size="sm"
          disabled={!hasEdits || isApplying}
          onClick={() => onApply(edits)}
        >
          {isApplying ? 'Applying…' : 'Apply'}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Clear selection"
          onClick={onClear}
        >
          <IconX className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
